import { describe, expect, it } from "vitest";

import { createFollowUpTimingReportHtml } from "../lib/weekly-reflection-follow-up-timing-report";

describe("تقرير وقت خطوات المتابعة", () => {
  it("يعرض مؤشرات الوقت والتأجيل ويحمي اسم المادة داخل تقرير محلي", () => {
    const html = createFollowUpTimingReportHtml({
      filterLabel: "الترم الأول",
      createdAt: new Date("2026-08-27T12:00:00.000Z"),
      insights: [{ subject: { id: "s1", termId: "t1", title: "مادة <عملية>", color: "#000000", hasPracticalSection: false, theoryInstructor: "د", createdAt: "2026" }, measuredCompletionCount: 2, averageCompletionHours: 30, postponementCount: 3, averagePostponementsPerCompleted: 1.5 }],
    });

    expect(html).toContain("مادة &lt;عملية&gt;");
    expect(html).toContain("1 ي");
    expect(html).toContain("مرات التأجيل");
    expect(html).toContain("أُنشئ هذا التقرير محلياً");
  });

  it("يعرض حالة واضحة حين لا تتوفر بيانات زمنية", () => {
    expect(createFollowUpTimingReportHtml({ insights: [] })).toContain("لا توجد بيانات زمنية مكتملة");
  });
});
