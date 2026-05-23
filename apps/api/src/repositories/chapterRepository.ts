import prisma from '../prisma';

export async function listChapters(courseId: number) {
  return prisma.chapter.findMany({ where: { courseId }, orderBy: { sortOrder: 'asc' } });
}

export async function createChapter(courseId: number, data: { name: string; description?: string | null; sortOrder?: number }) {
  return prisma.chapter.create({ data: { courseId, ...data } });
}

export async function getChapterById(id: number) {
  return prisma.chapter.findUnique({ where: { id } });
}

export async function updateChapter(id: number, data: { name?: string; description?: string | null; sortOrder?: number }) {
  return prisma.chapter.update({ where: { id }, data });
}

export async function deleteChapter(id: number) {
  return prisma.chapter.delete({ where: { id } });
}