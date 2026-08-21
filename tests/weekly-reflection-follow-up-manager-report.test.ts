import { describe, expect, it } from "vitest";
import { createFollowUpManagerReportHtml } from "../lib/weekly-reflection-follow-up-manager-report";
import type { ManagedFollowUpItem } from "../lib/weekly-reflection-follow-up-manager";

describe("تقرير حالة إدارة خطوات المتابعة", () => {
  it("يعرض الملخص والفلاتر والخطوات مع حماية HTML", () => {
    const items: ManagedFollowUpItem[] = [
      { weekStart: "2026-08-17", note: "ملاحظة <خاصة>", followUpGoal: "خطوة <مفتوحة>", followUpPriority: "high", followUpDueAt: "2026-08-20", followUpSubjectId: "subject-1", updatedAt: "x", status: "open", isOverdue: true },
      { weekStart: "2026-08-10", note: "", followUpGoal: "خطوة مكتملة", followUpPriority: "low", followUpCompleted: true, followUpCompletedAt: "2026-08-21T10:00:00.000Z", updatedAt: "x", status: "completed", isOverdue: false },
    ];
    const html = createFollowUpManagerReportHtml(items, { query: "بحث", status: "الكل", subject: "كل المواد", priority: "كل الأولويات", due: "كل المواعيد", sort: "ذكي" }, (id) => id === "subject-1" ? "الرياضيات" : undefined, new Date("2026-08-21T12:00:00.000Z"));
    expect(html).toContain("حالة خطوات المتابعة");
    expect(html).toContain("2 خطوة مطابقة");
    expect(html).toContain("1</b><span>مفتوحة");
    expect(html).toContain("الفلاتر الحالية");
    expect(html).toContain("خطوة &lt;مفتوحة&gt;");
    expect(html).toContain("ملاحظة &lt;خاصة&gt;");
    expect(html).toContain("الرياضيات");
  });
});
