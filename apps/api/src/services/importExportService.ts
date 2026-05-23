import prisma from '../prisma';

export const ImportExportService = {
  /**
   * Export all data (courses, chapters, lines, move nodes, sessions) to JSON. Stats and sessions
   * are included for completeness. The structure is versioned for future compatibility.
   */
  exportAll: async () => {
    // Fetch courses with chapters, lines and moves
    const courses = await prisma.course.findMany({
      include: {
        chapters: {
          include: {
            lines: {
              include: {
                moves: true,
              },
            },
          },
        },
      },
    });
    const sessions = await prisma.trainingSession.findMany({
      include: {
        attempts: true,
      },
    });
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      courses,
      sessions,
    };
  },
  /**
   * Import data from a JSON object. This will insert new courses, chapters, lines and move nodes.
   * Training sessions are not imported to avoid conflicts. Existing data is not deleted by default.
   */
  importAll: async (data: any) => {
    // Validate basic structure
    if (!data || typeof data !== 'object' || data.version !== 1) {
      throw new Error('Unsupported export format');
    }
    const { courses } = data;
    if (!Array.isArray(courses)) throw new Error('Invalid courses');
    for (const course of courses) {
      const newCourse = await prisma.course.create({
        data: {
          name: course.name,
          description: course.description ?? null,
        },
      });
      if (course.chapters) {
        for (const chapter of course.chapters) {
          const newChapter = await prisma.chapter.create({
            data: {
              courseId: newCourse.id,
              name: chapter.name,
              description: chapter.description ?? null,
              sortOrder: chapter.sortOrder ?? 0,
            },
          });
          if (chapter.lines) {
            for (const line of chapter.lines) {
              const newLine = await prisma.line.create({
                data: {
                  chapterId: newChapter.id,
                  name: line.name,
                  sideToTrain: line.sideToTrain,
                  startingFen: line.startingFen,
                  tags: line.tags ?? null,
                  notes: line.notes ?? null,
                  passedCount: line.passedCount ?? 0,
                  failedCount: line.failedCount ?? 0,
                  totalAttempts: line.totalAttempts ?? 0,
                  lastTrainedAt: line.lastTrainedAt ? new Date(line.lastTrainedAt) : null,
                },
              });
              // Map of old node ID to new node ID to maintain parent relations
              const idMap = new Map<number, number>();
              if (line.moves) {
                // Sort moves by id ascending to ensure parents are created before children
                const sortedMoves = [...line.moves].sort((a: any, b: any) => a.id - b.id);
                for (const move of sortedMoves) {
                  const newParentId = move.parentId ? idMap.get(move.parentId) ?? null : null;
                  const created = await prisma.moveNode.create({
                    data: {
                      lineId: newLine.id,
                      parentId: newParentId,
                      plyNumber: move.plyNumber,
                      fenBefore: move.fenBefore,
                      fenAfter: move.fenAfter,
                      moveUci: move.moveUci,
                      moveSan: move.moveSan,
                      moveNumber: move.moveNumber,
                      colorToMoveBefore: move.colorToMoveBefore,
                      side: move.side,
                      isUserMove: move.isUserMove,
                      isCorrectUserMove: move.isCorrectUserMove,
                      comment: move.comment ?? null,
                      annotation: move.annotation ?? null,
                      branchLabel: move.branchLabel ?? null,
                      branchWeight: move.branchWeight ?? null,
                      sortOrder: move.sortOrder ?? 0,
                      timesSeen: move.timesSeen ?? 0,
                      correctCount: move.correctCount ?? 0,
                      incorrectCount: move.incorrectCount ?? 0,
                      currentStreak: move.currentStreak ?? 0,
                      lastSeenAt: move.lastSeenAt ? new Date(move.lastSeenAt) : null,
                    },
                  });
                  idMap.set(move.id, created.id);
                }
              }
            }
          }
        }
      }
    }
    return { imported: true };
  },
};