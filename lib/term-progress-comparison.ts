import type { AcademicTerm, Lecture, ReviewCard, ReviewSession, Subject } from "./study-types";

export interface TermProgressSummary { term: AcademicTerm; lectureCount: number; reviewedCardCount: number; focusMinutes: number; }

/** يحسب مؤشرات كل ترم من بيانات المادة المحلية، ولا ينسب جلسات التركيز العامة بلا مادة إلى أي ترم. */
export function buildTermProgressComparison(terms: AcademicTerm[], subjects: Subject[], lectures: Lecture[], reviewCards: ReviewCard[], reviewSessions: ReviewSession[]): TermProgressSummary[] {
  return terms.map((term) => { const subjectIds = new Set(subjects.filter((subject) => subject.termId === term.id).map((subject) => subject.id)); const lectureIds = new Set(lectures.filter((lecture) => subjectIds.has(lecture.subjectId)).map((lecture) => lecture.id)); return { term, lectureCount: lectureIds.size, reviewedCardCount: reviewCards.filter((card) => lectureIds.has(card.lectureId) && card.lastReviewedAt).length, focusMinutes: reviewSessions.filter((session) => session.subjectId && subjectIds.has(session.subjectId)).reduce((sum, session) => sum + session.durationMinutes, 0) }; });
}

export function compareTermMetric(current: number, previous: number) { return current - previous; }
