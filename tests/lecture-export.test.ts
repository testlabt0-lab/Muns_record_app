import { describe, expect, it } from "vitest";

import { buildLectureExportHtml, formatBytes } from "../lib/lecture-export-template";
import type { Lecture } from "../lib/study-types";

const lecture: Lecture = {
  id: "lecture-1", subjectId: "subject-1", section: "theory", title: "محاضرة <تجريبية>", recordedAt: "2026-08-19T10:00:00.000Z", durationSeconds: 60,
  transcript: "نص <غير آمن>", transcriptionStatus: "completed", summaryStatus: "completed",
  summary: { overview: "نظرة عامة", keyPoints: ["نقطة"], terms: ["مصطلح"], reviewQuestions: ["سؤال؟"] },
};

describe("تصدير المحاضرة", () => {
  it("ينشئ مستنداً عربياً ويهّرب النصوص غير الآمنة", () => {
    const html = buildLectureExportHtml(lecture, { id: "subject-1", termId: "term-1", title: "مادة", color: "#4338CA", hasPracticalSection: false, theoryInstructor: "مدرس", createdAt: "2026-08-19" });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("محاضرة &lt;تجريبية&gt;");
    expect(html).toContain("نص &lt;غير آمن&gt;");
  });

  it("يضم الملاحظات العامة والموقّتة بعد تهريب محتواها", () => {
    const html = buildLectureExportHtml({ ...lecture, notes: [
      { id: "note-1", text: "فكرة <خاصة>", timestampSeconds: 75, createdAt: "2026-08-19T10:00:00.000Z", updatedAt: "2026-08-19T10:00:00.000Z" },
      { id: "note-2", text: "تذكير عام", createdAt: "2026-08-19T10:00:00.000Z", updatedAt: "2026-08-19T10:00:00.000Z" },
    ] });
    expect(html).toContain("ملاحظاتي");
    expect(html).toContain("عند 1:15");
    expect(html).toContain("فكرة &lt;خاصة&gt;");
    expect(html).toContain("ملاحظة عامة");
  });

  it("يعرض وحدات حجم قابلة للقراءة", () => {
    expect(formatBytes(0)).toBe("0 بايت");
    expect(formatBytes(1024)).toBe("1.0 كيلوبايت");
    expect(formatBytes(1024 * 1024)).toBe("1.0 ميغابايت");
  });
});
