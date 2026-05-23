import {
  listCourses,
  createCourse,
  getCourseById,
  updateCourse,
  deleteCourse,
} from '../repositories/courseRepository';

export const CourseService = {
  list: async () => listCourses(),
  create: async (data: { name: string; description?: string | null }) => createCourse(data),
  get: async (id: number) => getCourseById(id),
  update: async (id: number, data: { name?: string; description?: string | null }) => updateCourse(id, data),
  delete: async (id: number) => deleteCourse(id),
};