import { describe, expect, it } from "vitest";
import { getSubjectFourWeekTrend } from "../lib/subject-four-week-trend";

describe("اتجاه المادة لأربعة أسابيع", () => {
  it("يرتب نشاط البطاقة والتركيز من الأقدم إلى الأسبوع الحالي", () => {
    const trend = getSubjectFourWeekTrend("s", [{ id: "l", subjectId: "s", section: "theory", title: "ح", durationSeconds: 1, recordedAt: "2026-01-01", transcriptionStatus: "local", summaryStatus: "local" }], [{ id: "r", lectureId: "l", question: "س", answer: "ج", dueAt: "2026", intervalDays: 1, repetitions: 0, lastReviewedAt: "2026-01-07" }], [{ id: "x", subjectId: "s", durationMinutes: 25, completedAt: "2026-01-14" }], new Date("2026-01-22"));
    expect(trend).toHaveLength(4);
    expect(trend[1].reviewedCardCount).toBe(1);
    expect(trend[2].focusMinutes).toBe(25);
  });
});
