import prisma from '../prisma';

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