import type { FollowUpPriority, WeeklyReflection } from "./study-types";
import { normalizeFollowUpDueAt, normalizeFollowUpPriority } from "./weekly-reflection-follow-up";

const priorityWeight = { high: 0, medium: 1, low: 2 } as const;

export type FollowUpManagerStatus = "all" | "open" | "completed";
export type FollowUpManagerSort = "smart" | "recent" | "priority" | "due";
export type FollowUpManagerSubjectFilter = "all" | "unlinked" | string;
export type FollowUpManagerPriorityFilter = "all" | FollowUpPriority;
export type FollowUpManagerDueFilter = "all" | "overdue" | "today" | "week" | "unscheduled";
export type ManagedFollowUpItem = WeeklyReflection & { status: Exclude<FollowUpManagerStatus, "all">; isOverdue: boolean };

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("ar");
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function matchesDueFilter(dueAt: string | undefined, dueFilter: FollowUpManagerDueFilter, now: Date) {
  if (dueFilter === "all") return true;
  if (dueFilter === "unscheduled") return !dueAt;
  if (!dueAt) return false;
  const today = getDateKey(now);
  if (dueFilter === "overdue") return dueAt < today;
  if (dueFilter === "today") return dueAt === today;
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  return dueAt >= today && dueAt <= getDateKey(endOfWeek);
}

function getActivityDate(item: ManagedFollowUpItem) {
  return item.followUpCompletedAt ?? item.weekStart;
}

function compareManagedFollowUps(first: ManagedFollowUpItem, second: ManagedFollowUpItem, sort: FollowUpManagerSort) {
  if (sort === "recent") return getActivityDate(second).localeCompare(getActivityDate(first));
  if (first.status !== second.status) return first.status === "open" ? -1 : 1;
  if (first.status === "completed") return getActivityDate(second).localeCompare(getActivityDate(first));
  if (sort === "priority") return priorityWeight[first.followUpPriority ?? "medium"] - priorityWeight[second.followUpPriority ?? "medium"] || (first.followUpDueAt ?? "9999-12-31").localeCompare(second.followUpDueAt ?? "9999-12-31") || second.weekStart.localeCompare(first.weekStart);
  if (sort === "due") return (first.followUpDueAt ?? "9999-12-31").localeCompare(second.followUpDueAt ?? "9999-12-31") || priorityWeight[first.followUpPriority ?? "medium"] - priorityWeight[second.followUpPriority ?? "medium"] || second.weekStart.localeCompare(first.weekStart);
  return Number(second.isOverdue) - Number(first.isOverdue) || (first.followUpDueAt ?? "9999-12-31").localeCompare(second.followUpDueAt ?? "9999-12-31") || priorityWeight[first.followUpPriority ?? "medium"] - priorityWeight[second.followUpPriority ?? "medium"] || second.weekStart.localeCompare(first.weekStart);
}

export function getManagedFollowUpItems(reflections: WeeklyReflection[], query = "", status: FollowUpManagerStatus = "all", now = new Date(), sort: FollowUpManagerSort = "smart", subjectFilter: FollowUpManagerSubjectFilter = "all", priorityFilter: FollowUpManagerPriorityFilter = "all", dueFilter: FollowUpManagerDueFilter = "all"): ManagedFollowUpItem[] {
  const normalizedQuery = normalizeSearch(query);
  const today = now.toISOString().slice(0, 10);
  return reflections.filter((reflection) => {
    if (!reflection.followUpGoal) return false;
    const itemStatus = reflection.followUpCompleted ? "completed" : "open";
    if (status !== "all" && itemStatus !== status) return false;
    if (subjectFilter === "unlinked" && reflection.followUpSubjectId) return false;
    if (subjectFilter !== "all" && subjectFilter !== "unlinked" && reflection.followUpSubjectId !== subjectFilter) return false;
    if (priorityFilter !== "all" && (reflection.followUpPriority ?? "medium") !== priorityFilter) return false;
    if (!matchesDueFilter(reflection.followUpDueAt, dueFilter, now)) return false;
    return !normalizedQuery || `${reflection.followUpGoal} ${reflection.note}`.toLocaleLowerCase("ar").includes(normalizedQuery);
  }).map((reflection) => ({ ...reflection, status: reflection.followUpCompleted ? "completed" as const : "open" as const, isOverdue: Boolean(!reflection.followUpCompleted && reflection.followUpDueAt && reflection.followUpDueAt < today) })).sort((first, second) => compareManagedFollowUps(first, second, sort));
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

export function normalizeFollowUpManagerEdit(title: string, dueAt: unknown) {
  const followUpGoal = title.trim();
  if (!followUpGoal) return undefined;
  return { followUpGoal, followUpDueAt: normalizeFollowUpDueAt(dueAt) };
}

export function normalizeFollowUpManagerAssignment(subjectId: unknown, priority: unknown) {
  return { followUpSubjectId: typeof subjectId === "string" && subjectId.trim() ? subjectId : undefined, followUpPriority: normalizeFollowUpPriority(priority) };
}

export function getSelectedOpenFollowUpItems(items: ManagedFollowUpItem[], weekStarts: string[]) {
  const requested = new Set(weekStarts);
  return items.filter((item) => item.status === "open" && requested.has(item.weekStart));
}

export function getBatchFollowUpPostponeDate(dueAt: string | undefined, days: number, now = new Date()) {
  const base = dueAt ? new Date(`${dueAt}T12:00:00`) : new Date(now);
  base.setDate(base.getDate() + days);
  return getDateKey(base);
}
