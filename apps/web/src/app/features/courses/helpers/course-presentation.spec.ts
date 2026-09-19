import {
  courseCoverOption,
  courseCoverOptionsForSide,
  defaultCourseCover,
  percentLabel,
} from './course-presentation';

describe('course presentation', () => {
  it('keeps cover choices scoped to the selected training side', () => {
    expect(courseCoverOptionsForSide('WHITE').every((option) => option.side === 'WHITE')).toBeTrue();
    expect(courseCoverOptionsForSide('BLACK').every((option) => option.side === 'BLACK')).toBeTrue();
    expect(defaultCourseCover('BLACK')).toBe('SICILIAN');
  });

  it('uses a deterministic fallback for courses created before cover selection', () => {
    const first = courseCoverOption(21, 'WHITE', null);
    const second = courseCoverOption(21, 'WHITE', null);

    expect(second.key).toBe(first.key);
    expect(first.side).toBe('WHITE');
  });

  it('formats an absent recent pass rate without implying zero mastery', () => {
    expect(percentLabel(null)).toBe('No attempts');
    expect(percentLabel(0.576)).toBe('58%');
  });
});
