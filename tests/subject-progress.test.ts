import { describe, expect, it } from "vitest";

import { getSubjectProgress, progressPercent } from "../lib/subject-progress";

describe("تقدم المادة الفصلي", () => {
  it("يحسب التحويل والتلخيص والمراجعة والتركيز للمادة فقط", () => {
    const progress = getSubjectProgress("subject", [{ id: "lecture", subjectId: "subject", section: "theory", title: "محاضرة", recordedAt: "2026", durationSeconds: 95, transcript: "نص", transcriptionStatus: "completed", summaryStatus: "local" }, { id: "other", subjectId: "other", section: "theory", title: "أخرى", recordedAt: "2026", durationSeconds: 500, transcriptionStatus: "local", summaryStatus: "local" }], [{ id: "card", lectureId: "lecture", question: "س", answer: "ج", dueAt: "2026", intervalDays: 1, repetitions: 1, lastReviewedAt: "2026" }], [{ id: "session", subjectId: "subject", durationMinutes: 20, completedAt: "2026" }], [{ id: "task", subjectId: "subject", title: "واجب", kind: "assignment", dueAt: "2026", completed: true, createdAt: "2026" }]);
    expect(progress).toMatchObject({ lectureCount: 1, recordingMinutes: 2, transcribedCount: 1, summarizedCount: 0, reviewCardCount: 1, reviewedCardCount: 1, focusMinutes: 20, taskCount: 1, completedTaskCount: 1 });
    expect(progressPercent(1, 2)).toBe(50);
  });
});
