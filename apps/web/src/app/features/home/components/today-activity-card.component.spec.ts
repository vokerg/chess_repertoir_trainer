import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TodayActivityCardComponent } from './today-activity-card.component';
import type { HomeTodayActivity } from '../home-today-activity.models';

describe('TodayActivityCardComponent', () => {
  let fixture: ComponentFixture<TodayActivityCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodayActivityCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TodayActivityCardComponent);
  });

  it('renders native read-only checkbox status and bounded progress', () => {
    fixture.componentRef.setInput('activity', activity(false));
    fixture.detectChanges();

    const checkboxes = Array.from(
      fixture.nativeElement.querySelectorAll('input[type="checkbox"]'),
    ) as HTMLInputElement[];
    const overall = fixture.nativeElement.querySelector(
      '[aria-label="Daily goals completed"]',
    ) as HTMLElement;

    expect(checkboxes.length).toBe(2);
    expect(checkboxes.every((checkbox) => checkbox.disabled)).toBeTrue();
    expect(checkboxes.map((checkbox) => checkbox.checked)).toEqual([true, false]);
    expect(overall.getAttribute('aria-valuenow')).toBe('1');
    expect(overall.getAttribute('aria-valuemax')).toBe('2');
  });

  it('shows the positive all-done state when every server goal is complete', () => {
    fixture.componentRef.setInput('activity', activity(true));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.all-done')?.textContent).toContain(
      'Everything is done for today.',
    );
    expect(fixture.nativeElement.querySelector('.today-card-complete')).not.toBeNull();
  });
});

function activity(allCompleted: boolean): HomeTodayActivity {
  return {
    date: '2026-08-06',
    timeZone: 'Europe/Copenhagen',
    completedGoals: allCompleted ? 2 : 1,
    totalGoals: 2,
    completionPercent: allCompleted ? 100 : 50,
    allCompleted,
    hasProgress: true,
    goals: [
      {
        id: 'PLAY_GAME',
        label: 'Play a game',
        current: 1,
        target: 1,
        completed: true,
        progressPercent: 100,
      },
      {
        id: 'TRAIN_REPERTOIRE_LINES',
        label: 'Train repertoire lines',
        current: allCompleted ? 5 : 2,
        target: 5,
        completed: allCompleted,
        progressPercent: allCompleted ? 100 : 40,
      },
    ],
  };
}
