import type { OpenFollowUpItem } from "./weekly-reflection-follow-up-list";

const priorityWeight = { high: 0, medium: 1, low: 2 } as const;

export function getFollowUpReviewPreparation(items: OpenFollowUpItem[]) {
  const primary = [...items].sort((first, second) => priorityWeight[first.followUpPriority ?? "medium"] - priorityWeight[second.followUpPriority ?? "medium"] || (first.followUpDueAt ?? "9999-12-31").localeCompare(second.followUpDueAt ?? "9999-12-31"))[0];
  if (!primary) return undefined;
  return { minutes: 15, subjectId: primary.followUpSubjectId, followUpGoal: primary.followUpGoal };
}
