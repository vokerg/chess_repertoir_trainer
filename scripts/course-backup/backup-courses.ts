import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';

const FORMAT_VERSION = 2;
const repositoryRoot = path.resolve(__dirname, '..', '..');

type MoveRecord = {
  id: number;
  parentId: number | null;
  moveUci: string;
  comment: string | null;
  annotation: string | null;
  branchLabel: string | null;
  branchWeight: number | null;
};

type BackupMove = {
  moveUci: string;
  comment?: string;
  annotation?: string;
  branchLabel?: string;
  branchWeight?: number;
  children: BackupMove[];
};

type ScriptOptions = {
  userId?: number;
  outputRoot: string;
};

function parseOptions(args: string[]): ScriptOptions {
  let userId: number | undefined;
  let outputRoot = path.join(repositoryRoot, 'backups', 'courses');

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--user-id') {
      const value = args[index + 1];
      if (!value) {
        throw new Error('--user-id requires a positive integer.');
      }
      userId = parsePositiveInteger(value, '--user-id');
      index += 1;
      continue;
    }

    if (argument.startsWith('--user-id=')) {
      userId = parsePositiveInteger(argument.slice('--user-id='.length), '--user-id');
      continue;
    }

    if (argument === '--output-root') {
      const value = args[index + 1];
      if (!value) {
        throw new Error('--output-root requires a directory path.');
      }
      outputRoot = path.resolve(process.cwd(), value);
      index += 1;
      continue;
    }

    if (argument.startsWith('--output-root=')) {
      outputRoot = path.resolve(process.cwd(), argument.slice('--output-root='.length));
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return { userId, outputRoot };
}

function parsePositiveInteger(value: string, optionName: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${optionName} must be a positive integer.`);
  }
  return parsed;
}

function timestampDirectoryName(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

function courseFileName(courseIndex: number, courseName: string): string {
  const slug = courseName
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  const sequence = String(courseIndex + 1).padStart(2, '0');
  return `course-${sequence}${slug ? `-${slug}` : ''}.json`;
}

function buildMoveTree(moves: MoveRecord[]): BackupMove[] {
  const childrenByParentId = new Map<number | null, MoveRecord[]>();
  for (const move of moves) {
    const siblings = childrenByParentId.get(move.parentId) ?? [];
    siblings.push(move);
    childrenByParentId.set(move.parentId, siblings);
  }

  const buildChildren = (parentId: number | null): BackupMove[] =>
    (childrenByParentId.get(parentId) ?? []).map((move) => ({
      moveUci: move.moveUci,
      ...(move.comment === null ? {} : { comment: move.comment }),
      ...(move.annotation === null ? {} : { annotation: move.annotation }),
      ...(move.branchLabel === null ? {} : { branchLabel: move.branchLabel }),
      ...(move.branchWeight === null ? {} : { branchWeight: move.branchWeight }),
      children: buildChildren(move.id),
    }));

  return buildChildren(null);
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  dotenv.config({ path: path.join(repositoryRoot, 'apps', 'api', '.env') });

  const { default: prisma } = await import('../../apps/api/src/prisma');
  const exportedAt = new Date();
  const directoryName = timestampDirectoryName(exportedAt);
  const finalDirectory = path.join(options.outputRoot, directoryName);
  const temporaryDirectory = `${finalDirectory}.partial`;

  try {
    const courses = await prisma.course.findMany({
      where: options.userId === undefined ? undefined : { userId: options.userId },
      orderBy: [{ userId: 'asc' }, { id: 'asc' }],
      select: {
        name: true,
        description: true,
        chapters: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          select: {
            name: true,
            description: true,
            sortOrder: true,
            lines: {
              orderBy: { id: 'asc' },
              select: {
                name: true,
                sideToTrain: true,
                startingFen: true,
                tags: true,
                notes: true,
                moves: {
                  orderBy: [{ plyNumber: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
                  select: {
                    id: true,
                    parentId: true,
                    moveUci: true,
                    comment: true,
                    annotation: true,
                    branchLabel: true,
                    branchWeight: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    await mkdir(options.outputRoot, { recursive: true });
    await mkdir(temporaryDirectory);

    const files: Array<{ name: string; file: string }> = [];

    for (const [courseIndex, course] of courses.entries()) {
      const file = courseFileName(courseIndex, course.name);
      const backup = {
        formatVersion: FORMAT_VERSION,
        course: {
          name: course.name,
          ...(course.description === null ? {} : { description: course.description }),
          chapters: course.chapters.map((chapter) => ({
            name: chapter.name,
            ...(chapter.description === null ? {} : { description: chapter.description }),
            sortOrder: chapter.sortOrder,
            lines: chapter.lines.map((line) => ({
              name: line.name,
              sideToTrain: line.sideToTrain,
              startingFen: line.startingFen,
              ...(line.tags === null ? {} : { tags: line.tags }),
              ...(line.notes === null ? {} : { notes: line.notes }),
              moves: buildMoveTree(line.moves),
            })),
          })),
        },
      };

      await writeFile(
        path.join(temporaryDirectory, file),
        `${JSON.stringify(backup, null, 2)}\n`,
        'utf8',
      );
      files.push({ name: course.name, file });
    }

    const manifest = {
      formatVersion: FORMAT_VERSION,
      courseCount: courses.length,
      files,
    };

    await writeFile(
      path.join(temporaryDirectory, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );
    await rename(temporaryDirectory, finalDirectory);

    console.log(`Backed up ${courses.length} course${courses.length === 1 ? '' : 's'} to ${finalDirectory}`);
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
