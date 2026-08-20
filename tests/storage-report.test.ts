import { describe, expect, it } from "vitest";

import { createStorageReportHtml } from "../lib/storage-report";

describe("createStorageReportHtml", () => {
  it("يلخص المحاضرات ويهمل النصوص غير الآمنة في أسماء المواد", () => {
    const html = createStorageReportHtml({
      generatedAt: new Date("2026-08-20T10:00:00.000Z"),
      subjects: [{ id: "subject-1", termId: "term-1", title: "تشريح <عملي>", color: "#000", hasPracticalSection: false, theoryInstructor: "د. س", createdAt: "2026-08-01T00:00:00.000Z" }],
      lectures: [{ id: "lecture-1", subjectId: "subject-1", section: "theory", title: "المحاضرة الأولى", recordedAt: "2026-08-19T10:00:00.000Z", durationSeconds: 30, audioSizeBytes: 1024, attachments: [{ id: "file-1", lectureId: "lecture-1", kind: "pdf", title: "ملف", uri: "file:///x.pdf", mimeType: "application/pdf", sizeBytes: 1024, createdAt: "2026-08-19T10:00:00.000Z" }], transcriptionStatus: "local", summaryStatus: "local" }],
    });

    expect(html).toContain("تقرير مساحة التخزين");
    expect(html).toContain("2.0 ك.ب");
    expect(html).toContain("تشريح &lt;عملي&gt;");
    expect(html).not.toContain("تشريح <عملي>");
  });
});
