import { describe, expect, it } from "vitest";
import { buildFollowUpSubjectTimingInsights, formatFollowUpCompletionTime } from "../lib/weekly-reflection-follow-up-timing-insights";

describe("مؤشرات زمن خطوات المتابعة حسب المادة", () => {
  it("تحسب متوسط الإتمام والتأجيل وتتجاهل التواريخ الناقصة", () => {
    const result = buildFollowUpSubjectTimingInsights([{ id: "s1", termId: "t", title: "رياضيات", color: "#000", hasPracticalSection: false, theoryInstructor: "م", createdAt: "x" }], [
      { weekStart: "2026-08-10", note: "", followUpGoal: "تمرين", followUpSubjectId: "s1", followUpCreatedAt: "2026-08-10T10:00:00.000Z", followUpCompletedAt: "2026-08-11T10:00:00.000Z", followUpCompleted: true, updatedAt: "x" },
      { weekStart: "2026-08-17", note: "", followUpGoal: "بدون تاريخ بدء", followUpSubjectId: "s1", followUpCompletedAt: "2026-08-18T10:00:00.000Z", followUpCompleted: true, updatedAt: "x" },
    ], [{ id: "a1", weekStart: "2026-08-10", subjectId: "s1", type: "postponed", createdAt: "x" }, { id: "a2", weekStart: "2026-08-10", subjectId: "s1", type: "postponed", createdAt: "x" }]);
    expect(result[0]).toMatchObject({ measuredCompletionCount: 1, averageCompletionHours: 24, postponementCount: 2, averagePostponementsPerCompleted: 2 });
    expect(formatFollowUpCompletionTime(result[0].averageCompletionHours)).toBe("1 ي");
  });
});
