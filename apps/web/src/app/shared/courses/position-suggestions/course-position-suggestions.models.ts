export interface CoursePositionSuggestion {
  nodeId: number;
  fenBefore: string;
  fenAfter: string;
  moveUci: string;
  moveSan: string;
  isUserMove: boolean;
  isCorrectUserMove: boolean;
  sortOrder: number;
  lineId: number;
  lineName: string;
  chapterId: number;
  chapterName: string;
  chapterSortOrder: number;
  courseId: number;
  courseName: string;
}

export interface CoursePositionSuggestionsResponse {
  normalizedFen: string;
  suggestions: CoursePositionSuggestion[];
}
