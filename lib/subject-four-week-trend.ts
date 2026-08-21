import type { Lecture, ReviewCard, ReviewSession } from "./study-types";
import { getWeekStartIso } from "./subject-weekly-goals";

export interface SubjectWeekTrend { weekStart: string; reviewedCardCount: number; focusMinutes: number; }

export function getSubjectFourWeekTrend(subjectId: string, lectures: Lecture[], reviewCards: ReviewCard[], reviewSessions: ReviewSession[], now = new Date()): SubjectWeekTrend[] {
  const lectureIds = new Set(lectures.filter((lecture) => lecture.subjectId === subjectId).map((lecture) => lecture.id));
  return Array.from({ length: 4 }, (_, index) => {
    const pivot = new Date(now); pivot.setDate(pivot.getDate() - (3 - index) * 7);
    const weekStart = getWeekStartIso(pivot); const start = new Date(weekStart).getTime(); const end = start + 7 * 24 * 60 * 60 * 1000;
    const inWeek = (value: string | undefined) => Boolean(value && new Date(value).getTime() >= start && new Date(value).getTime() < end);
    return { weekStart, reviewedCardCount: reviewCards.filter((card) => lectureIds.has(card.lectureId) && inWeek(card.lastReviewedAt)).length, focusMinutes: reviewSessions.filter((session) => session.subjectId === subjectId && inWeek(session.completedAt)).reduce((sum, session) => sum + session.durationMinutes, 0) };
  });
}
