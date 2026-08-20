import { describe, expect, it } from "vitest";

import { getSubjectWeeklyComparison, weeklyDelta } from "../lib/subject-weekly-comparison";

describe("مقارنة أداء المادة الأسبوعية", () => {
  it("يفصل البيانات الحالية عن الأسبوع السابق بحسب الوقت والمادة", () => {
    const data = getSubjectWeeklyComparison("s", [{ id: "current", subjectId: "s", section: "theory", title: "ح", durationSeconds: 1, recordedAt: "2026-01-06", transcriptionStatus: "local", summaryStatus: "local" }, { id: "old", subjectId: "s", section: "theory", title: "ق", durationSeconds: 1, recordedAt: "2025-12-30", transcriptionStatus: "local", summaryStatus: "local" }], [{ id: "r", lectureId: "current", question: "س", answer: "ج", dueAt: "2026", intervalDays: 1, repetitions: 0, lastReviewedAt: "2026-01-07" }], [{ id: "a", subjectId: "s", durationMinutes: 20, completedAt: "2026-01-07" }, { id: "b", subjectId: "s", durationMinutes: 10, completedAt: "2025-12-31" }], new Date("2026-01-08"));
    expect(data.current).toEqual({ lectureCount: 1, reviewedCardCount: 1, focusMinutes: 20 });
    expect(data.previous).toEqual({ lectureCount: 1, reviewedCardCount: 0, focusMinutes: 10 });
    expect(weeklyDelta(data.current.focusMinutes, data.previous.focusMinutes)).toBe(10);
  });
});
