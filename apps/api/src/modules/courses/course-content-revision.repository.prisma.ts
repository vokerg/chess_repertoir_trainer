import { Prisma } from '@prisma/client';

export async function incrementCourseContentRevision(
  courseId: number,
  tx: Prisma.TransactionClient,
) {
  return tx.course.update({
    where: { id: courseId },
    data: {
      contentRevision: { increment: 1 },
      contentChangedAt: new Date(),
    },
    select: { id: true, contentRevision: true, contentChangedAt: true },
  });
}
