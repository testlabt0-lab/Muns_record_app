import { describe, expect, it } from "vitest";

import { createWeeklySummaryReportHtml } from "../lib/weekly-summary-report";

describe("createWeeklySummaryReportHtml", () => {
  it("يعرض المحاضرات الأسبوعية ويهمل HTML في عناوينها", () => {
    const html = createWeeklySummaryReportHtml({
      generatedAt: new Date("2026-08-20T10:00:00.000Z"),
      subjects: [{ id: "subject-1", termId: "term-1", title: "تشريح", color: "#000", hasPracticalSection: false, theoryInstructor: "د. س", createdAt: "2026-08-01T00:00:00.000Z" }],
      reviewCards: [{ id: "card-1", lectureId: "lecture-1", question: "س؟", answer: "ج", dueAt: "2026-08-21T00:00:00.000Z", intervalDays: 1, repetitions: 1, lastReviewedAt: "2026-08-19T10:00:00.000Z" }],
      reviewLists: [{ id: "list-1", title: "مراجعة", lectureIds: ["lecture-1"], completedLectureIds: ["lecture-1"], createdAt: "2026-08-19T00:00:00.000Z" }],
      weeklyReflection: { weekStart: "2026-08-17", note: "<خطة> مراجعة التشريح", updatedAt: "2026-08-20T00:00:00.000Z" },
      lectures: [{ id: "lecture-1", subjectId: "subject-1", section: "theory", title: "محاضرة <مهمة>", recordedAt: "2026-08-19T10:00:00.000Z", durationSeconds: 30, audioSizeBytes: 1024, tags: ["امتحان"], attachments: [], transcriptionStatus: "local", summaryStatus: "local" }],
    });

    expect(html).toContain("موجز الأسبوع");
    expect(html).toContain("محاضرة &lt;مهمة&gt;");
    expect(html).not.toContain("محاضرة <مهمة>");
    expect(html).toContain("ملاحظتي الختامية");
    expect(html).toContain("&lt;خطة&gt; مراجعة التشريح");
    expect(html).toContain("1/1");
  });
});
