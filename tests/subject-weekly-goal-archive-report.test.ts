import { describe, expect, it } from "vitest";
import { createSubjectWeeklyGoalArchiveReportHtml } from "../lib/subject-weekly-goal-archive-report";

describe("تقرير أرشيف أهداف الأسابيع", () => {
  it("ينشئ تقريراً عربياً يضم المادة ونسب الأهداف", () => {
    const html = createSubjectWeeklyGoalArchiveReportHtml({ id: "s", termId: "t", title: "إحصاء", color: "#000", hasPracticalSection: false, theoryInstructor: "م", createdAt: "x" }, [{ goal: { subjectId: "s", weekStart: "2026-01-05", reviewTarget: 4, focusMinutesTarget: 60, updatedAt: "x" }, reviewedPercent: 75, focusPercent: 50 }]);
    expect(html).toContain("إحصاء"); expect(html).toContain("75%"); expect(html).toContain("أرشيف أهداف الأسابيع");
  });
});
