import { describe, expect, it } from "vitest";
import { buildLectureSearchText } from "../lib/library-search";

const lecture = {
  id: "lecture-1", subjectId: "subject-1", section: "theory" as const, title: "محاضرة التشريح", recordedAt: "2026-08-20T00:00:00.000Z", durationSeconds: 120, transcriptionStatus: "local" as const, summaryStatus: "local" as const,
  attachments: [{ id: "attachment-1", lectureId: "lecture-1", kind: "image" as const, title: "السبورة", uri: "file://board.jpg", mimeType: "image/jpeg", extractedText: "العصب الحائر ينظم وظائف داخلية", extractionKeyPoints: ["الجهاز العصبي الذاتي"], createdAt: "2026-08-20T00:00:00.000Z" }],
};

describe("فهرس المكتبة", () => {
  it("يضم النص والنقاط المستخرجة من مرفقات المحاضرة", () => {
    const index = buildLectureSearchText(lecture);
    expect(index).toContain("العصب الحائر");
    expect(index).toContain("الجهاز العصبي الذاتي");
  });
});
