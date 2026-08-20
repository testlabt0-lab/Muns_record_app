import type { ReviewCard } from "@/lib/study-types";

export type ReviewGrade = "again" | "hard" | "good" | "easy";

export function scheduleReview(card: ReviewCard, grade: ReviewGrade, now = new Date()): Pick<ReviewCard, "intervalDays" | "dueAt" | "repetitions" | "lastReviewedAt"> {
  const current = Math.max(1, card.intervalDays || 1);
  const nextInterval = grade === "again"
    ? 1
    : grade === "hard"
      ? Math.max(1, Math.round(current * 1.25))
      : grade === "easy"
        ? Math.min(90, Math.max(2, Math.round(current * 3)))
        : Math.min(60, Math.max(2, Math.round(current * 2)));
  const repetitions = grade === "again" ? 0 : card.repetitions + 1;
  return {
    intervalDays: nextInterval,
    dueAt: new Date(now.getTime() + nextInterval * 86_400_000).toISOString(),
    repetitions,
    lastReviewedAt: now.toISOString(),
  };
}

export function isReviewDue(card: ReviewCard, now = new Date()) {
  return new Date(card.dueAt).getTime() <= now.getTime();
}
