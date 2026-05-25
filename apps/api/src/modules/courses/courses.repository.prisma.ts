import prisma from '../../prisma';

export async function listCourses() {
  return prisma.course.findMany({ orderBy: { id: 'asc' } });
}

export async function createCourse(data: { name: string; description?: string | null }) {
  return prisma.course.create({ data });
}

export async function getCourseById(id: number) {
  return prisma.course.findUnique({ where: { id } });
}

export async function updateCourse(id: number, data: { name?: string; description?: string | null }) {
  return prisma.course.update({ where: { id }, data });
}

export async function deleteCourse(id: number) {
  return prisma.course.delete({ where: { id } });
}

export async function listChapters(courseId: number) {
  return prisma.chapter.findMany({ where: { courseId }, orderBy: { sortOrder: 'asc' } });
}

export async function createChapter(courseId: number, data: { name: string; description?: string | null; sortOrder?: number }) {
  return prisma.chapter.create({ data: { courseId, ...data } });
}

export async function updateChapter(id: number, data: { name?: string; description?: string | null; sortOrder?: number }) {
  return prisma.chapter.update({ where: { id }, data });
}

export async function deleteChapter(id: number) {
  return prisma.chapter.delete({ where: { id } });
}

export async function listLines(chapterId: number) {
  return prisma.line.findMany({ where: { chapterId }, orderBy: { id: 'asc' } });
}

export async function createLine(
  chapterId: number,
  data: { name: string; sideToTrain: string; startingFen: string; tags?: string | null; notes?: string | null },
) {
  return prisma.line.create({ data: { chapterId, ...data } });
}

export async function getLineById(id: number) {
  return prisma.line.findUnique({ where: { id } });
}

export async function updateLine(
  id: number,
  data: Partial<{ name: string; sideToTrain: string; startingFen: string; tags: string | null; notes: string | null }>,
) {
  return prisma.line.update({ where: { id }, data });
}

export async function deleteLine(id: number) {
  return prisma.line.delete({ where: { id } });
}

export async function getLineMoveNodes(lineId: number) {
  return prisma.moveNode.findMany({ where: { lineId }, orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }] });
}

export async function getNodeById(id: number) {
  return prisma.moveNode.findUnique({ where: { id } });
}

export async function createMoveNode(data: any) {
  return prisma.moveNode.create({ data });
}

export async function updateMoveNode(id: number, data: any) {
  return prisma.moveNode.update({ where: { id }, data });
}

export async function deleteNodeAndSubtree(id: number) {
  return prisma.moveNode.delete({ where: { id } });
}

export async function existsCorrectUserMove(lineId: number, parentId: number | null) {
  const count = await prisma.moveNode.count({
    where: { lineId, parentId, isUserMove: true, isCorrectUserMove: true },
  });
  return count > 0;
}
