import type { FollowUpActivityType, WeeklyReflection } from "./study-types";

export type FollowUpActivityDraft = Pick<import("./study-types").FollowUpActivity, "weekStart" | "type" | "subjectId" | "createdAt">;

export function getFollowUpActivityDraft(previous: WeeklyReflection | undefined, next: WeeklyReflection, createdAt: string): FollowUpActivityDraft | undefined {
  if (!next.followUpGoal) return undefined;
  if (!previous?.followUpGoal) return { weekStart: next.weekStart, type: "created", subjectId: next.followUpSubjectId, createdAt };
  const type: FollowUpActivityType | undefined = !previous.followUpCompleted && next.followUpCompleted ? "completed" : previous.followUpCompleted && !next.followUpCompleted ? "reopened" : previous.followUpDueAt !== next.followUpDueAt && Boolean(previous.followUpDueAt && next.followUpDueAt && next.followUpDueAt > previous.followUpDueAt) ? "postponed" : previous.followUpGoal !== next.followUpGoal || previous.followUpSubjectId !== next.followUpSubjectId || previous.followUpPriority !== next.followUpPriority || previous.followUpDueAt !== next.followUpDueAt ? "updated" : undefined;
  return type ? { weekStart: next.weekStart, type, subjectId: next.followUpSubjectId, createdAt } : undefined;
}

export function getFollowUpActivityLabel(type: FollowUpActivityType) {
  return type === "created" ? "أُنشئت الخطوة" : type === "completed" ? "اكتملت الخطوة" : type === "reopened" ? "أُعيد فتح الخطوة" : type === "postponed" ? "أُجّل الاستحقاق" : "عُدّلت الخطوة";
}
