"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const chess_js_1 = require("chess.js");
const Color = {
    WHITE: 'WHITE',
    BLACK: 'BLACK'
};
const prisma = new client_1.PrismaClient();
async function main() {
    // Remove existing data to ensure idempotent seeding
    await prisma.trainingAttemptMove.deleteMany();
    await prisma.trainingSession.deleteMany();
    await prisma.moveNode.deleteMany();
    await prisma.line.deleteMany();
    await prisma.chapter.deleteMany();
    await prisma.course.deleteMany();
    // Create a course
    const course = await prisma.course.create({
        data: {
            name: 'My White Repertoire',
            description: 'Sample repertoire for White.',
        },
    });
    // Create a chapter
    const chapter = await prisma.chapter.create({
        data: {
            courseId: course.id,
            name: '1.e4',
            description: 'The King\'s Pawn opening',
            sortOrder: 0,
        },
    });
    // Create a line
    const line = await prisma.line.create({
        data: {
            chapterId: chapter.id,
            name: 'Italian Game sample',
            sideToTrain: Color.WHITE,
            startingFen: 'startpos',
            notes: 'A simple Italian Game line.',
        },
    });
    // Helper to create move nodes
    const createMove = async (parentId, moveUci, plyNumber, chess, isUserMove, isCorrectUserMove) => {
        const fenBefore = chess.fen();
        let moveSan = '';
        let moveNumber = Math.ceil(plyNumber / 2);
        let colorToMoveBefore;
        let side;
        let fenAfter = fenBefore;
        if (moveUci) {
            const move = chess.move(moveUci, { sloppy: true });
            if (!move) {
                throw new Error(`Invalid move ${moveUci} at ply ${plyNumber}`);
            }
            moveSan = move.san;
            fenAfter = chess.fen();
            colorToMoveBefore = move.color === 'w' ? Color.WHITE : Color.BLACK;
            side = isUserMove ? line.sideToTrain : (line.sideToTrain === Color.WHITE ? Color.BLACK : Color.WHITE);
        }
        else {
            colorToMoveBefore = line.sideToTrain;
            side = line.sideToTrain;
        }
        const node = await prisma.moveNode.create({
            data: {
                lineId: line.id,
                parentId,
                plyNumber,
                fenBefore,
                fenAfter,
                moveUci: moveUci !== null && moveUci !== void 0 ? moveUci : '',
                moveSan,
                moveNumber,
                colorToMoveBefore,
                side,
                isUserMove,
                isCorrectUserMove,
            },
        });
        return node;
    };
    // Initialize chess from starting position
    const chess = new chess_js_1.Chess();
    // Root node
    const rootNode = await createMove(null, null, 0, chess, false, false);
    // Main line: 1. e4 e5 2. Nf3 Nc6 3. Bc4
    // Move 1: White e4
    chess.reset();
    let node = rootNode;
    // Use new chess instance to compute successive FENs
    let chessLine = new chess_js_1.Chess();
    const move1White = await prisma.moveNode.create({
        data: {
            lineId: line.id,
            parentId: rootNode.id,
            plyNumber: 1,
            fenBefore: chessLine.fen(),
            fenAfter: '',
            moveUci: '',
            moveSan: '',
            moveNumber: 1,
            colorToMoveBefore: Color.WHITE,
            side: Color.WHITE,
            isUserMove: true,
            isCorrectUserMove: true,
        },
    });
    // Actually compute FENs and SAN and update the record
    const moveObj1 = chessLine.move('e2e4');
    await prisma.moveNode.update({
        where: { id: move1White.id },
        data: {
            fenAfter: chessLine.fen(),
            moveUci: 'e2e4',
            moveSan: moveObj1.san,
        },
    });
    // Black main reply: e5
    const move1Black = await prisma.moveNode.create({
        data: {
            lineId: line.id,
            parentId: move1White.id,
            plyNumber: 2,
            fenBefore: chessLine.fen(),
            fenAfter: '',
            moveUci: '',
            moveSan: '',
            moveNumber: 1,
            colorToMoveBefore: Color.BLACK,
            side: Color.BLACK,
            isUserMove: false,
            isCorrectUserMove: false,
        },
    });
    const moveObj2 = chessLine.move('e7e5');
    await prisma.moveNode.update({
        where: { id: move1Black.id },
        data: {
            fenAfter: chessLine.fen(),
            moveUci: 'e7e5',
            moveSan: moveObj2.san,
        },
    });
    // White move: Nf3
    const move2White = await prisma.moveNode.create({
        data: {
            lineId: line.id,
            parentId: move1Black.id,
            plyNumber: 3,
            fenBefore: chessLine.fen(),
            fenAfter: '',
            moveUci: '',
            moveSan: '',
            moveNumber: 2,
            colorToMoveBefore: Color.WHITE,
            side: Color.WHITE,
            isUserMove: true,
            isCorrectUserMove: true,
        },
    });
    const moveObj3 = chessLine.move('g1f3');
    await prisma.moveNode.update({
        where: { id: move2White.id },
        data: {
            fenAfter: chessLine.fen(),
            moveUci: 'g1f3',
            moveSan: moveObj3.san,
        },
    });
    // Black move: Nc6
    const move2Black = await prisma.moveNode.create({
        data: {
            lineId: line.id,
            parentId: move2White.id,
            plyNumber: 4,
            fenBefore: chessLine.fen(),
            fenAfter: '',
            moveUci: '',
            moveSan: '',
            moveNumber: 2,
            colorToMoveBefore: Color.BLACK,
            side: Color.BLACK,
            isUserMove: false,
            isCorrectUserMove: false,
        },
    });
    const moveObj4 = chessLine.move('b8c6');
    await prisma.moveNode.update({
        where: { id: move2Black.id },
        data: {
            fenAfter: chessLine.fen(),
            moveUci: 'b8c6',
            moveSan: moveObj4.san,
        },
    });
    // White move: Bc4
    const move3White = await prisma.moveNode.create({
        data: {
            lineId: line.id,
            parentId: move2Black.id,
            plyNumber: 5,
            fenBefore: chessLine.fen(),
            fenAfter: '',
            moveUci: '',
            moveSan: '',
            moveNumber: 3,
            colorToMoveBefore: Color.WHITE,
            side: Color.WHITE,
            isUserMove: true,
            isCorrectUserMove: true,
        },
    });
    const moveObj5 = chessLine.move('f1c4');
    await prisma.moveNode.update({
        where: { id: move3White.id },
        data: {
            fenAfter: chessLine.fen(),
            moveUci: 'f1c4',
            moveSan: moveObj5.san,
        },
    });
    // Add an alternative opponent branch to illustrate branching: 1... c5 2.Nf3
    // Reset to after White's first move
    const altChess = new chess_js_1.Chess();
    altChess.move('e2e4');
    const altBranch = await prisma.moveNode.create({
        data: {
            lineId: line.id,
            parentId: move1White.id,
            plyNumber: 2,
            fenBefore: altChess.fen(),
            fenAfter: '',
            moveUci: '',
            moveSan: '',
            moveNumber: 1,
            colorToMoveBefore: Color.BLACK,
            side: Color.BLACK,
            isUserMove: false,
            isCorrectUserMove: false,
            sortOrder: 1,
        },
    });
    const altMove = altChess.move('c7c5');
    await prisma.moveNode.update({
        where: { id: altBranch.id },
        data: {
            fenAfter: altChess.fen(),
            moveUci: 'c7c5',
            moveSan: altMove.san,
        },
    });
    // Follow up from 1...c5: 2.Nf3
    const altUserMove = await prisma.moveNode.create({
        data: {
            lineId: line.id,
            parentId: altBranch.id,
            plyNumber: 3,
            fenBefore: altChess.fen(),
            fenAfter: '',
            moveUci: '',
            moveSan: '',
            moveNumber: 2,
            colorToMoveBefore: Color.WHITE,
            side: Color.WHITE,
            isUserMove: true,
            isCorrectUserMove: true,
        },
    });
    const altMoveObj = altChess.move('g1f3');
    await prisma.moveNode.update({
        where: { id: altUserMove.id },
        data: {
            fenAfter: altChess.fen(),
            moveUci: 'g1f3',
            moveSan: altMoveObj.san,
        },
    });
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
//# sourceMappingURL=seed.js.map