import { describe, expect, it } from "vitest";

import { createSubjectFollowUpReportHtml } from "../lib/subject-follow-up-report";

describe("تقرير متابعة المواد", () => {
  it("يعرض الحالة ويؤمّن اسم المادة في التقرير المحلي", () => {
    const html = createSubjectFollowUpReportHtml({ filterLabel: "الترم الأول", createdAt: new Date("2026-01-01"), items: [{ subject: { id: "s", termId: "t", title: "مادة <عملية>", color: "#000", hasPracticalSection: false, theoryInstructor: "د", createdAt: "2026" }, progress: { lectureCount: 0, recordingMinutes: 0, transcribedCount: 0, summarizedCount: 0, reviewCardCount: 0, reviewedCardCount: 0, focusMinutes: 0, taskCount: 0, completedTaskCount: 0 }, percent: 0, status: "unplanned", reason: "لا يوجد هدف" }] });
    expect(html).toContain("مادة &lt;عملية&gt;");
    expect(html).toContain("بلا هدف");
    expect(html).toContain("أُنشئ هذا التقرير محلياً");
  });
});
