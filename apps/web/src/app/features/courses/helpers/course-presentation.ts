import type { CourseCoverKey, CourseSide } from '@chess-trainer/contracts/courses';

export interface CourseCoverOption {
  key: CourseCoverKey;
  label: string;
  side: CourseSide;
  imageUrl: string;
  alt: string;
}

export const COURSE_COVER_OPTIONS: readonly CourseCoverOption[] = [
  {
    key: 'QUEENS_GAMBIT',
    label: 'Open centre',
    side: 'WHITE',
    imageUrl: '/assets/course-covers/queens-gambit.jpg',
    alt: 'Ivory pieces advancing on a walnut chessboard',
  },
  {
    key: 'FIANCHETTO',
    label: 'Fianchetto',
    side: 'WHITE',
    imageUrl: '/assets/course-covers/fianchetto.jpg',
    alt: 'Ivory bishop and knight in a quiet study',
  },
  {
    key: 'WHITE_INITIATIVE',
    label: 'Initiative',
    side: 'WHITE',
    imageUrl: '/assets/course-covers/white-initiative.jpg',
    alt: 'Ivory queen and knight on a green chessboard',
  },
  {
    key: 'SICILIAN',
    label: 'Counterplay',
    side: 'BLACK',
    imageUrl: '/assets/course-covers/sicilian.jpg',
    alt: 'Ebony knight and pawn on a dark wooden chessboard',
  },
  {
    key: 'CLASSICAL_DEFENSE',
    label: 'Classical',
    side: 'BLACK',
    imageUrl: '/assets/course-covers/classical-defense.jpg',
    alt: 'Ebony rook and bishop in a restrained defensive setup',
  },
  {
    key: 'BLACK_COUNTERPLAY',
    label: 'Dynamic',
    side: 'BLACK',
    imageUrl: '/assets/course-covers/black-counterplay.jpg',
    alt: 'Ebony queen and knight on a stone chessboard',
  },
];

export function courseCoverOptionsForSide(side: CourseSide): readonly CourseCoverOption[] {
  return COURSE_COVER_OPTIONS.filter((option) => option.side === side);
}

export function defaultCourseCover(side: CourseSide): CourseCoverKey {
  return side === 'WHITE' ? 'QUEENS_GAMBIT' : 'SICILIAN';
}

export function courseCoverOption(
  courseId: number,
  side: CourseSide,
  coverKey: CourseCoverKey | null,
): CourseCoverOption {
  const selected = coverKey
    ? COURSE_COVER_OPTIONS.find((option) => option.key === coverKey)
    : undefined;
  if (selected) return selected;

  const options = courseCoverOptionsForSide(side);
  return options[Math.abs(courseId) % options.length] ?? COURSE_COVER_OPTIONS[0];
}

export function courseSideLabel(side: CourseSide): string {
  return side === 'WHITE' ? 'White repertoire' : 'Black repertoire';
}

export function percentLabel(value: number | null | undefined): string {
  return value == null ? 'No attempts' : `${Math.round(value * 100)}%`;
}
