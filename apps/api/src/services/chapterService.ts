import {
  listChapters,
  createChapter,
  getChapterById,
  updateChapter,
  deleteChapter,
} from '../repositories/chapterRepository';

export const ChapterService = {
  list: async (courseId: number) => listChapters(courseId),
  create: async (courseId: number, data: { name: string; description?: string | null; sortOrder?: number }) =>
    createChapter(courseId, data),
  get: async (id: number) => getChapterById(id),
  update: async (id: number, data: { name?: string; description?: string | null; sortOrder?: number }) =>
    updateChapter(id, data),
  delete: async (id: number) => deleteChapter(id),
};