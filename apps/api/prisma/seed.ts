import { PrismaClient } from '@prisma/client';
import { Chess } from 'chess.js';

const Color = {
  WHITE: 'WHITE',
  BLACK: 'BLACK',
} as const;

type ColorValue = (typeof Color)[keyof typeof Color];

const prisma = new PrismaClient();

function colorToMove(chess: Chess): ColorValue {
  return chess.turn() === 'w' ? Color.WHITE : Color.BLACK;
}

function parseUci(moveUci: string): { from: string; to: string; promotion?: string } {
  return {
    from: moveUci.slice(0, 2),
    to: moveUci.slice(2, 4),
    promotion: moveUci.length === 5 ? moveUci[4] : undefined,
  };
}

async function createMove(lineId: number, parentId: number | null, fenBefore: string, moveUci: string, plyNumber: number, sideToTrain: ColorValue, sortOrder = 0) {
  const chess = fenBefore === 'startpos' ? new Chess() : new Chess(fenBefore);
  const colorToMoveBefore = colorToMove(chess);
  const move = chess.move(parseUci(moveUci));
  if (!move) {
    throw new Error(`Invalid move ${moveUci} from ${fenBefore}`);
  }

  const isUserMove = colorToMoveBefore === sideToTrain;
  return prisma.moveNode.create({
    data: {
      lineId,
      parentId,
      plyNumber,
      fenBefore,
      fenAfter: chess.fen(),
      moveUci,
      moveSan: move.san,
      moveNumber: Math.ceil(plyNumber / 2),
      colorToMoveBefore,
      side: colorToMoveBefore,
      isUserMove,
      isCorrectUserMove: isUserMove,
      sortOrder,
    },
  });
}

async function main() {
  await prisma.trainingAttemptMove.deleteMany();
  await prisma.trainingSession.deleteMany();
  await prisma.moveNode.deleteMany();
  await prisma.line.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.course.deleteMany();

  const course = await prisma.course.create({
    data: {
      name: 'My White Repertoire',
      description: 'Sample repertoire for White.',
    },
  });

  const chapter = await prisma.chapter.create({
    data: {
      courseId: course.id,
      name: '1.e4',
      description: 'The King\'s Pawn opening',
      sortOrder: 0,
    },
  });

  const line = await prisma.line.create({
    data: {
      chapterId: chapter.id,
      name: 'Italian Game sample',
      sideToTrain: Color.WHITE,
      startingFen: 'startpos',
      notes: 'A simple Italian Game line with branching Black replies.',
    },
  });

  const sideToTrain = Color.WHITE;
  const startFen = 'startpos';

  // Main line: 1. e4 e5 2. Nf3 Nc6 3. Bc4
  const e4 = await createMove(line.id, null, startFen, 'e2e4', 1, sideToTrain);
  const e5 = await createMove(line.id, e4.id, e4.fenAfter, 'e7e5', 2, sideToTrain);
  const nf3AfterE5 = await createMove(line.id, e5.id, e5.fenAfter, 'g1f3', 3, sideToTrain);
  const nc6 = await createMove(line.id, nf3AfterE5.id, nf3AfterE5.fenAfter, 'b8c6', 4, sideToTrain);
  await createMove(line.id, nc6.id, nc6.fenAfter, 'f1c4', 5, sideToTrain);

  // Opponent branch: 1... c5 2. Nf3
  const c5 = await createMove(line.id, e4.id, e4.fenAfter, 'c7c5', 2, sideToTrain, 1);
  await createMove(line.id, c5.id, c5.fenAfter, 'g1f3', 3, sideToTrain);

  // Opponent branch: 1... e6 2. d4
  const e6 = await createMove(line.id, e4.id, e4.fenAfter, 'e7e6', 2, sideToTrain, 2);
  await createMove(line.id, e6.id, e6.fenAfter, 'd2d4', 3, sideToTrain);

  console.log('✅ Seed data created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
