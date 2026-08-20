import { describe, expect, it } from "vitest";

import { createMonthlyFocusReportHtml } from "../lib/monthly-focus-report";

describe("تقرير التركيز الشهري", () => {
  it("يعرض الجلسات والمادة والنص المحلي الآمن", () => {
    const html = createMonthlyFocusReportHtml({ generatedAt: new Date("2026-08-20T12:00:00.000Z"), subjects: [{ id: "subject-1", termId: "term-1", title: "تشريح <عملي>", color: "#000", hasPracticalSection: false, theoryInstructor: "د", createdAt: "2026-01-01" }], reviewSessions: [{ id: "session-1", subjectId: "subject-1", durationMinutes: 25, completedAt: "2026-08-20T10:00:00.000Z" }] });
    expect(html).toContain("25");
    expect(html).toContain("تشريح &lt;عملي&gt;");
    expect(html).toContain("لا يرسل أي بيانات دراسة");
  });
});
