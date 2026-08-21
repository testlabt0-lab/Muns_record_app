import type { FollowUpPriority, WeeklyReflection } from "./study-types";

const priorityWeight = { high: 0, medium: 1, low: 2 } as const;

export type FollowUpManagerStatus = "all" | "open" | "completed";
export type ManagedFollowUpItem = WeeklyReflection & { status: Exclude<FollowUpManagerStatus, "all">; isOverdue: boolean };

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("ar");
}

export function getManagedFollowUpItems(reflections: WeeklyReflection[], query = "", status: FollowUpManagerStatus = "all", now = new Date()): ManagedFollowUpItem[] {
  const normalizedQuery = normalizeSearch(query);
  const today = now.toISOString().slice(0, 10);
  return reflections.filter((reflection) => {
    if (!reflection.followUpGoal) return false;
    const itemStatus = reflection.followUpCompleted ? "completed" : "open";
    if (status !== "all" && itemStatus !== status) return false;
    return !normalizedQuery || `${reflection.followUpGoal} ${reflection.note}`.toLocaleLowerCase("ar").includes(normalizedQuery);
  }).map((reflection) => ({ ...reflection, status: reflection.followUpCompleted ? "completed" as const : "open" as const, isOverdue: Boolean(!reflection.followUpCompleted && reflection.followUpDueAt && reflection.followUpDueAt < today) })).sort((first, second) => {
    if (first.status !== second.status) return first.status === "open" ? -1 : 1;
    if (first.status === "completed") return (second.followUpCompletedAt ?? second.weekStart).localeCompare(first.followUpCompletedAt ?? first.weekStart);
    return Number(second.isOverdue) - Number(first.isOverdue) || (first.followUpDueAt ?? "9999-12-31").localeCompare(second.followUpDueAt ?? "9999-12-31") || priorityWeight[first.followUpPriority ?? "medium"] - priorityWeight[second.followUpPriority ?? "medium"] || second.weekStart.localeCompare(first.weekStart);
  });
}

export function getFollowUpManagerCounts(items: ManagedFollowUpItem[]) {
  return { open: items.filter((item) => item.status === "open").length, completed: items.filter((item) => item.status === "completed").length };
}

export function getReopenedFollowUpAttributes(reflection: WeeklyReflection) {
  return {
    rating: reflection.rating,
    focusAreas: reflection.focusAreas,
    followUpGoal: reflection.followUpGoal,
    followUpCompleted: false,
    followUpCompletedAt: undefined,
    followUpPriority: reflection.followUpPriority,
    followUpDueAt: reflection.followUpDueAt,
    followUpSubjectId: reflection.followUpSubjectId,
    followUpRepeatsWeekly: reflection.followUpRepeatsWeekly,
  };
}
