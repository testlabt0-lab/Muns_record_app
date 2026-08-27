import type { OpenFollowUpItem } from "./weekly-reflection-follow-up-list";

const priorityWeight = { high: 0, medium: 1, low: 2 } as const;

export interface FollowUpBatchReviewPreparation {
  minutes: 15 | 25 | 45;
  subjectId?: string;
  selectedCount: number;
  subjectCount: number;
}

export function getFollowUpBatchReviewPreparation(items: OpenFollowUpItem[]): FollowUpBatchReviewPreparation | undefined {
  if (!items.length) return undefined;
  const subjectItems = items.filter((item) => Boolean(item.followUpSubjectId));
  const subjectIds = Array.from(new Set(subjectItems.map((item) => item.followUpSubjectId).filter(Boolean))) as string[];
  const primarySubjectId = [...subjectIds].sort((first, second) => {
    const firstItems = subjectItems.filter((item) => item.followUpSubjectId === first);
    const secondItems = subjectItems.filter((item) => item.followUpSubjectId === second);
    const firstPriority = Math.min(...firstItems.map((item) => priorityWeight[item.followUpPriority ?? "medium"]));
    const secondPriority = Math.min(...secondItems.map((item) => priorityWeight[item.followUpPriority ?? "medium"]));
    const firstDueAt = firstItems.map((item) => item.followUpDueAt ?? "9999-12-31").sort()[0];
    const secondDueAt = secondItems.map((item) => item.followUpDueAt ?? "9999-12-31").sort()[0];
    return secondItems.length - firstItems.length || firstPriority - secondPriority || firstDueAt.localeCompare(secondDueAt) || first.localeCompare(second);
  })[0];
  const minutes: 15 | 25 | 45 = items.length <= 2 ? 15 : items.length <= 4 ? 25 : 45;
  return { minutes, subjectId: primarySubjectId, selectedCount: items.length, subjectCount: subjectIds.length };
}
