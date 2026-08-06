import type { TodayActivityResponse } from '../activity-feed';
import type { HomeTodayActivity, HomeTodayGoal } from './home-today-activity.models';

export function buildHomeTodayActivity(
  response: TodayActivityResponse | null,
): HomeTodayActivity | null {
  if (!response) return null;

  const goals: readonly HomeTodayGoal[] = response.goals.map((goal) => ({
    id: goal.id,
    label: goal.label,
    current: goal.current,
    target: goal.target,
    completed: goal.completed,
    progressPercent: Math.min(100, Math.round((goal.current / goal.target) * 100)),
  }));
  const totalGoals = goals.length;
  const completedGoals = goals.filter((goal) => goal.completed).length;

  return {
    date: response.date,
    timeZone: response.timeZone,
    goals,
    completedGoals,
    totalGoals,
    completionPercent: totalGoals === 0 ? 0 : Math.round((completedGoals / totalGoals) * 100),
    allCompleted: totalGoals > 0 && completedGoals === totalGoals,
    hasProgress: goals.some((goal) => goal.current > 0),
  };
}

export function resolveBrowserTimeZone(): string | null {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();
    if (!timeZone) return null;
    new Intl.DateTimeFormat('en-US', { timeZone }).format();
    return timeZone;
  } catch {
    return null;
  }
}
