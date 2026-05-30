import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/api/endpoints';

export function useCourses() {
  return useQuery({ queryKey: ['courses'], queryFn: endpoints.courses.list });
}

export function useCourseStats(courseId: number) {
  return useQuery({ queryKey: ['courseStats', courseId], queryFn: () => endpoints.courses.stats(courseId), enabled: courseId > 0 });
}

export function useChapters(courseId: number) {
  return useQuery({ queryKey: ['chapters', courseId], queryFn: () => endpoints.courses.chapters(courseId), enabled: courseId > 0 });
}

export function useLines(chapterId: number) {
  return useQuery({ queryKey: ['lines', chapterId], queryFn: () => endpoints.chapters.lines(chapterId), enabled: chapterId > 0 });
}
