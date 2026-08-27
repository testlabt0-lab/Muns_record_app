import type { FollowUpFilterPreset } from "./study-types";
import type { FollowUpManagerDueFilter, FollowUpManagerPriorityFilter, FollowUpManagerSort, FollowUpManagerStatus, FollowUpManagerSubjectFilter } from "./weekly-reflection-follow-up-manager";

export type FollowUpFilterPresetInput = Pick<FollowUpFilterPreset, "status" | "sort" | "subjectFilter" | "priorityFilter" | "dueFilter">;

export function normalizeFollowUpFilterPresetTitle(title: string) { return title.trim().slice(0, 48); }
export function createFollowUpFilterPreset(id: string, title: string, filters: { status: FollowUpManagerStatus; sort: FollowUpManagerSort; subjectFilter: FollowUpManagerSubjectFilter; priorityFilter: FollowUpManagerPriorityFilter; dueFilter: FollowUpManagerDueFilter }, createdAt: string): FollowUpFilterPreset | undefined {
  const normalizedTitle = normalizeFollowUpFilterPresetTitle(title);
  return normalizedTitle ? { id, title: normalizedTitle, ...filters, createdAt } : undefined;
}
