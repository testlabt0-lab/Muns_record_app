import type { WeeklyReflection } from "./study-types";
import { getWeekStartIso } from "./subject-weekly-goals";

const DEFAULT_MONTHLY_TARGET = 4;

function getMonthKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function getReflectionCompletionDate(reflection: WeeklyReflection) {
  const value = reflection.followUpCompletedAt ?? reflection.weekStart;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getPreviousWeekStart(date: Date) {
  const currentWeek = new Date(getWeekStartIso(date));
  currentWeek.setUTCDate(currentWeek.getUTCDate() - 7);
  return currentWeek.toISOString();
}

export function normalizeFollowUpMonthlyTarget(value: number | undefined) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 99 ? value : DEFAULT_MONTHLY_TARGET;
}

export function getFollowUpMonthlyGoalProgress(reflections: WeeklyReflection[], target: number | undefined, date = new Date()) {
  const normalizedTarget = normalizeFollowUpMonthlyTarget(target);
  const monthKey = getMonthKey(date);
  const completedCount = reflections.filter((reflection) => {
    if (!reflection.followUpGoal || !reflection.followUpCompleted) return false;
    const completedAt = getReflectionCompletionDate(reflection);
    return Boolean(completedAt && getMonthKey(completedAt) === monthKey);
  }).length;
  return {
    monthKey,
    monthLabel: date.toLocaleDateString("ar", { month: "long", year: "numeric" }),
    target: normalizedTarget,
    completedCount,
    remainingCount: Math.max(0, normalizedTarget - completedCount),
    percent: Math.min(100, Math.round(completedCount / normalizedTarget * 100)),
    isReached: completedCount >= normalizedTarget,
  };
}

export function getFollowUpStreakBreakStatus(reflections: WeeklyReflection[], date = new Date()) {
  const currentWeekStart = getWeekStartIso(date);
  const previousWeekStart = getPreviousWeekStart(date);
  const completedWeekStarts = new Set(reflections.filter((reflection) => reflection.followUpGoal && reflection.followUpCompleted).map((reflection) => reflection.weekStart));
  const hasCompletedCurrentWeek = completedWeekStarts.has(currentWeekStart);
  const hasCompletedPreviousWeek = completedWeekStarts.has(previousWeekStart);
  const lastCompletedWeekStart = Array.from(completedWeekStarts).filter((weekStart) => weekStart < previousWeekStart).sort().at(-1);
  const isBroken = !hasCompletedCurrentWeek && !hasCompletedPreviousWeek && Boolean(lastCompletedWeekStart);
  return { isBroken, missedWeekStart: isBroken ? previousWeekStart : undefined, lastCompletedWeekStart };
}

export function shouldNotifyFollowUpStreakBreak(enabled: boolean | undefined, lastNotifiedWeek: string | undefined, status: ReturnType<typeof getFollowUpStreakBreakStatus>) {
  return Boolean(enabled && status.isBroken && status.missedWeekStart && status.missedWeekStart !== lastNotifiedWeek);
}
