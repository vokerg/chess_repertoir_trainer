import type { TodayActivityResponse } from '../activity-feed';
import { buildHomeTodayActivity } from './home-today-activity.helpers';

const GOALS: TodayActivityResponse['goals'] = [
  goal('PLAY_GAME', 'GAMES_PLAYED', 'Play a game', 1),
  goal('TRAIN_REPERTOIRE_LINES', 'REPERTOIRE_LINES_TRAINED', 'Train repertoire lines', 5),
  goal('COMPLETE_LICHESS_PUZZLES', 'LICHESS_PUZZLES_COMPLETED', 'Complete Lichess puzzles', 3),
  goal('COMPLETE_TACTICAL_SCENARIO', 'TACTICAL_SCENARIOS_COMPLETED', 'Complete a tactical scenario', 1),
  goal('COMPLETE_GAME_ANALYSIS', 'GAME_ANALYSES_COMPLETED', 'Complete a game analysis', 1),
];

describe('home today activity view model', () => {
  it('maps partial server progress without deriving completion independently', () => {
    const response = todayResponse([
      { ...GOALS[0], current: 1, completed: true },
      { ...GOALS[1], current: 2, completed: false },
      ...GOALS.slice(2),
    ]);

    const view = buildHomeTodayActivity(response);

    expect(view?.completedGoals).toBe(1);
    expect(view?.completionPercent).toBe(20);
    expect(view?.goals[1].progressValue).toBe(2);
    expect(view?.goals[1].progressPercent).toBe(40);
    expect(view?.goals[1].completed).toBe(false);
    expect(view?.hasProgress).toBe(true);
  });

  it('caps semantic progress at the target while retaining the actual server count', () => {
    const response = todayResponse([
      { ...GOALS[1], current: 8, completed: true },
    ]);

    const view = buildHomeTodayActivity(response);

    expect(view?.goals[0].current).toBe(8);
    expect(view?.goals[0].target).toBe(5);
    expect(view?.goals[0].progressValue).toBe(5);
    expect(view?.goals[0].progressPercent).toBe(100);
  });

  it('recognizes the positive all-complete state from server booleans', () => {
    const response = todayResponse(GOALS.map((item) => ({
      ...item,
      current: item.target,
      completed: true,
    })));

    const view = buildHomeTodayActivity(response);

    expect(view?.allCompleted).toBe(true);
    expect(view?.completedGoals).toBe(5);
    expect(view?.completionPercent).toBe(100);
  });

  it('keeps zero activity distinct from an unavailable response', () => {
    const view = buildHomeTodayActivity(todayResponse(GOALS));

    expect(view?.hasProgress).toBe(false);
    expect(view?.allCompleted).toBe(false);
    expect(view?.completionPercent).toBe(0);
    expect(buildHomeTodayActivity(null)).toBeNull();
  });
});

function todayResponse(goals: TodayActivityResponse['goals']): TodayActivityResponse {
  return {
    contractVersion: '2026-08-v1',
    timeZone: 'Europe/Copenhagen',
    date: '2026-08-06',
    activities: [],
    goals,
  };
}

function goal(
  id: TodayActivityResponse['goals'][number]['id'],
  activityType: TodayActivityResponse['goals'][number]['activityType'],
  label: string,
  target: number,
): TodayActivityResponse['goals'][number] {
  return { id, activityType, label, current: 0, target, completed: false };
}
