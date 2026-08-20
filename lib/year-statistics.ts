import type { AcademicTerm, Lecture, ReviewCard, ReviewSession, StudyTask, Subject } from "./study-types";

export interface YearStatistics {
  subjectCount: number;
  practicalSubjectCount: number;
  lectureCount: number;
  archivedLectureCount: number;
  recordingMinutes: number;
  transcribedLectureCount: number;
  summarizedLectureCount: number;
  reviewCardCount: number;
  reviewedCardCount: number;
  focusMinutes: number;
  taskCount: number;
  completedTaskCount: number;
  storageBytes: number;
}

export function getYearStatistics(input: { yearId: string; terms: AcademicTerm[]; subjects: Subject[]; lectures: Lecture[]; reviewCards: ReviewCard[]; reviewSessions: ReviewSession[]; tasks: StudyTask[] }): YearStatistics {
  const termIds = new Set(input.terms.filter((term) => term.yearId === input.yearId).map((term) => term.id));
  const yearSubjects = input.subjects.filter((subject) => termIds.has(subject.termId));
  const subjectIds = new Set(yearSubjects.map((subject) => subject.id));
  const yearLectures = input.lectures.filter((lecture) => subjectIds.has(lecture.subjectId));
  const lectureIds = new Set(yearLectures.map((lecture) => lecture.id));
  const cards = input.reviewCards.filter((card) => lectureIds.has(card.lectureId));
  const tasks = input.tasks.filter((task) => task.subjectId && subjectIds.has(task.subjectId));
  return {
    subjectCount: yearSubjects.length,
    practicalSubjectCount: yearSubjects.filter((subject) => subject.hasPracticalSection).length,
    lectureCount: yearLectures.length,
    archivedLectureCount: yearLectures.filter((lecture) => Boolean(lecture.archivedAt)).length,
    recordingMinutes: Math.round(yearLectures.reduce((total, lecture) => total + lecture.durationSeconds, 0) / 60),
    transcribedLectureCount: yearLectures.filter((lecture) => lecture.transcriptionStatus === "completed" || Boolean(lecture.transcript)).length,
    summarizedLectureCount: yearLectures.filter((lecture) => lecture.summaryStatus === "completed" || Boolean(lecture.summary)).length,
    reviewCardCount: cards.length,
    reviewedCardCount: cards.filter((card) => Boolean(card.lastReviewedAt)).length,
    focusMinutes: input.reviewSessions.filter((session) => session.subjectId && subjectIds.has(session.subjectId)).reduce((total, session) => total + session.durationMinutes, 0),
    taskCount: tasks.length,
    completedTaskCount: tasks.filter((task) => task.completed).length,
    storageBytes: yearLectures.reduce((total, lecture) => total + (lecture.audioSizeBytes ?? 0) + (lecture.attachments ?? []).reduce((attachmentTotal, attachment) => attachmentTotal + (attachment.sizeBytes ?? 0), 0), 0),
  };
}
