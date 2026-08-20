import { describe, expect, it } from "vitest";

import { createSubjectProgressReportHtml } from "../lib/subject-progress-report";

describe("تقرير تقدم المادة", () => {
  it("يعرض المؤشرات ويؤمّن عنوان المادة في تقرير محلي", () => {
    const html = createSubjectProgressReportHtml({ subject: { id: "s", termId: "t", title: "كيمياء <عملية>", color: "#000", hasPracticalSection: false, theoryInstructor: "د", createdAt: "2026" }, progress: { lectureCount: 4, recordingMinutes: 80, transcribedCount: 3, summarizedCount: 2, reviewCardCount: 10, reviewedCardCount: 5, focusMinutes: 45, taskCount: 2, completedTaskCount: 1 }, createdAt: new Date("2026-01-20") });
    expect(html).toContain("كيمياء &lt;عملية&gt;");
    expect(html).toContain("3 من 4");
    expect(html).toContain("أُنشئ هذا التقرير محلياً");
  });
});
