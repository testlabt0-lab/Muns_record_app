import type { Lecture, ReviewCard, ReviewSession, StudyTask } from "./study-types";

export interface SubjectProgress {
  lectureCount: number;
  recordingMinutes: number;
  transcribedCount: number;
  summarizedCount: number;
  reviewCardCount: number;
  reviewedCardCount: number;
  focusMinutes: number;
  taskCount: number;
  completedTaskCount: number;
}

export function getSubjectProgress(subjectId: string, lectures: Lecture[], reviewCards: ReviewCard[], reviewSessions: ReviewSession[], tasks: StudyTask[]): SubjectProgress {
  const subjectLectures = lectures.filter((lecture) => lecture.subjectId === subjectId);
  const lectureIds = new Set(subjectLectures.map((lecture) => lecture.id));
  const cards = reviewCards.filter((card) => lectureIds.has(card.lectureId));
  const subjectTasks = tasks.filter((task) => task.subjectId === subjectId);
  return {
    lectureCount: subjectLectures.length,
    recordingMinutes: Math.round(subjectLectures.reduce((total, lecture) => total + lecture.durationSeconds, 0) / 60),
    transcribedCount: subjectLectures.filter((lecture) => lecture.transcriptionStatus === "completed" || Boolean(lecture.transcript)).length,
    summarizedCount: subjectLectures.filter((lecture) => lecture.summaryStatus === "completed" || Boolean(lecture.summary)).length,
    reviewCardCount: cards.length,
    reviewedCardCount: cards.filter((card) => Boolean(card.lastReviewedAt)).length,
    focusMinutes: reviewSessions.filter((session) => session.subjectId === subjectId).reduce((total, session) => total + session.durationMinutes, 0),
    taskCount: subjectTasks.length,
    completedTaskCount: subjectTasks.filter((task) => task.completed).length,
  };
}

export function progressPercent(completed: number, total: number) { return total > 0 ? Math.round((completed / total) * 100) : 0; }
