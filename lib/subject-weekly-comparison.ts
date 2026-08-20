import type { Lecture, ReviewCard, ReviewSession } from "./study-types";
import { getWeekStartIso } from "./subject-weekly-goals";

export interface SubjectWeekMetrics { lectureCount: number; reviewedCardCount: number; focusMinutes: number; }
export interface SubjectWeeklyComparison { current: SubjectWeekMetrics; previous: SubjectWeekMetrics; }

function metricsForRange(subjectId: string, from: number, to: number, lectures: Lecture[], reviewCards: ReviewCard[], reviewSessions: ReviewSession[]): SubjectWeekMetrics { const subjectLectures = lectures.filter((lecture) => lecture.subjectId === subjectId); const lectureIds = new Set(subjectLectures.map((lecture) => lecture.id)); const inRange = (value: string | undefined) => value ? new Date(value).getTime() >= from && new Date(value).getTime() < to : false; return { lectureCount: subjectLectures.filter((lecture) => inRange(lecture.recordedAt)).length, reviewedCardCount: reviewCards.filter((card) => lectureIds.has(card.lectureId) && inRange(card.lastReviewedAt)).length, focusMinutes: reviewSessions.filter((session) => session.subjectId === subjectId && inRange(session.completedAt)).reduce((sum, session) => sum + session.durationMinutes, 0) }; }

/** يقارن محاضرات ومراجعة وتركيز المادة بين الأسبوع الحالي والأسبوع الذي سبقه. */
export function getSubjectWeeklyComparison(subjectId: string, lectures: Lecture[], reviewCards: ReviewCard[], reviewSessions: ReviewSession[], now = new Date()): SubjectWeeklyComparison { const currentStart = new Date(getWeekStartIso(now)).getTime(); const previousStart = currentStart - 7 * 24 * 60 * 60 * 1000; const currentEnd = currentStart + 7 * 24 * 60 * 60 * 1000; return { current: metricsForRange(subjectId, currentStart, currentEnd, lectures, reviewCards, reviewSessions), previous: metricsForRange(subjectId, previousStart, currentStart, lectures, reviewCards, reviewSessions) }; }
export function weeklyDelta(current: number, previous: number) { return current - previous; }
