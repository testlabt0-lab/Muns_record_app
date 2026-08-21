import { describe, expect, it } from "vitest";
import { getArchivedWeeklyGoals } from "../lib/subject-weekly-goal-archive";

describe("أرشيف أهداف المادة الأسبوعية", () => {
  it("يعرض الأسابيع السابقة فقط ويحسبها ضمن حدود الأسبوع", () => {
    const archived = getArchivedWeeklyGoals("s", [{ subjectId: "s", weekStart: "2026-01-05T00:00:00.000Z", reviewTarget: 2, focusMinutesTarget: 20, updatedAt: "x" }, { subjectId: "s", weekStart: "2026-01-19T00:00:00.000Z", reviewTarget: 2, focusMinutesTarget: 20, updatedAt: "x" }], [{ id: "l", subjectId: "s", section: "theory", title: "ح", durationSeconds: 1, recordedAt: "x", transcriptionStatus: "local", summaryStatus: "local" }], [{ id: "r", lectureId: "l", question: "س", answer: "ج", dueAt: "x", intervalDays: 1, repetitions: 0, lastReviewedAt: "2026-01-07" }], [{ id: "p", subjectId: "s", durationMinutes: 20, completedAt: "2026-01-08" }], new Date("2026-01-22"));
    expect(archived).toHaveLength(1); expect(archived[0].reviewedPercent).toBe(50); expect(archived[0].focusPercent).toBe(100);
  });
});
