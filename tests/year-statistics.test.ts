import { describe, expect, it } from "vitest";

import { getYearStatistics } from "../lib/year-statistics";

describe("إحصاءات السنة الدراسية", () => {
  it("تقتصر على المواد والمحاضرات المرتبطة بالسنة المحددة", () => {
    const result = getYearStatistics({
      yearId: "year-1",
      terms: [{ id: "term-1", yearId: "year-1", kind: "first", title: "الأول", createdAt: "2026" }, { id: "term-2", yearId: "year-2", kind: "first", title: "الأول", createdAt: "2026" }],
      subjects: [{ id: "subject-1", termId: "term-1", title: "تشريح", color: "#000", hasPracticalSection: true, theoryInstructor: "د", createdAt: "2026" }, { id: "subject-2", termId: "term-2", title: "أخرى", color: "#000", hasPracticalSection: false, theoryInstructor: "د", createdAt: "2026" }],
      lectures: [{ id: "lecture-1", subjectId: "subject-1", section: "theory", title: "الأولى", recordedAt: "2026", durationSeconds: 90, audioSizeBytes: 100, attachments: [{ id: "attachment", lectureId: "lecture-1", kind: "pdf", title: "ملف", uri: "file:///file", mimeType: "application/pdf", sizeBytes: 50, createdAt: "2026" }], transcript: "نص", transcriptionStatus: "completed", summaryStatus: "completed" }, { id: "lecture-2", subjectId: "subject-2", section: "theory", title: "أخرى", recordedAt: "2026", durationSeconds: 500, transcriptionStatus: "local", summaryStatus: "local" }],
      reviewCards: [{ id: "card", lectureId: "lecture-1", question: "س", answer: "ج", dueAt: "2026", intervalDays: 1, repetitions: 1, lastReviewedAt: "2026" }],
      reviewSessions: [{ id: "session", subjectId: "subject-1", durationMinutes: 25, completedAt: "2026" }, { id: "other", subjectId: "subject-2", durationMinutes: 40, completedAt: "2026" }],
      tasks: [{ id: "task", subjectId: "subject-1", title: "واجب", kind: "assignment", dueAt: "2026", completed: true, createdAt: "2026" }, { id: "other-task", subjectId: "subject-2", title: "آخر", kind: "assignment", dueAt: "2026", completed: false, createdAt: "2026" }],
    });

    expect(result).toMatchObject({ subjectCount: 1, practicalSubjectCount: 1, lectureCount: 1, recordingMinutes: 2, transcribedLectureCount: 1, summarizedLectureCount: 1, reviewCardCount: 1, reviewedCardCount: 1, focusMinutes: 25, taskCount: 1, completedTaskCount: 1, storageBytes: 150 });
  });
});
