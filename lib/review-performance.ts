import type { ReviewCard, ReviewSession } from "./study-types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface WeeklyPerformanceComparison {
  focusCurrent: number;
  focusPrevious: number;
  cardsCurrent: number;
  cardsPrevious: number;
}

/** يقارن الأسبوع المتحرك الحالي بأسبوعه السابق، مع إبقاء الحدود غير متداخلة. */
export function compareWeeklyPerformance(reviewSessions: ReviewSession[], reviewCards: ReviewCard[], now = Date.now()): WeeklyPerformanceComparison {
  const currentStart = now - WEEK_MS;
  const previousStart = now - (WEEK_MS * 2);
  const within = (value: string | undefined, from: number, to: number) => {
    const time = value ? new Date(value).getTime() : Number.NaN;
    return Number.isFinite(time) && time >= from && time < to;
  };
  const focusMinutes = (from: number, to: number) => reviewSessions.filter((session) => within(session.completedAt, from, to)).reduce((total, session) => total + session.durationMinutes, 0);
  const reviewedCards = (from: number, to: number) => reviewCards.filter((card) => within(card.lastReviewedAt, from, to)).length;
  return {
    focusCurrent: focusMinutes(currentStart, now),
    focusPrevious: focusMinutes(previousStart, currentStart),
    cardsCurrent: reviewedCards(currentStart, now),
    cardsPrevious: reviewedCards(previousStart, currentStart),
  };
}
