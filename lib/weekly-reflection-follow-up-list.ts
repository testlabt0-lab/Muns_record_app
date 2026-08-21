import type { WeeklyReflection } from "./study-types";

const priorityWeight = { high: 0, medium: 1, low: 2 } as const;
export type OpenFollowUpItem = WeeklyReflection & { isOverdue: boolean };
export function getOpenFollowUpItems(reflections: WeeklyReflection[], now = new Date()): OpenFollowUpItem[] { const today = now.toISOString().slice(0, 10); return reflections.filter((reflection) => Boolean(reflection.followUpGoal) && !reflection.followUpCompleted).map((reflection) => ({ ...reflection, isOverdue: Boolean(reflection.followUpDueAt && reflection.followUpDueAt < today) })).sort((a, b) => Number(b.isOverdue) - Number(a.isOverdue) || (a.followUpDueAt ?? "9999-12-31").localeCompare(b.followUpDueAt ?? "9999-12-31") || priorityWeight[a.followUpPriority ?? "medium"] - priorityWeight[b.followUpPriority ?? "medium"] || b.weekStart.localeCompare(a.weekStart)); }
