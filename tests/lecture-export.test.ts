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

  it("يعرض وحدات حجم قابلة للقراءة", () => {
    expect(formatBytes(0)).toBe("0 بايت");
    expect(formatBytes(1024)).toBe("1.0 كيلوبايت");
    expect(formatBytes(1024 * 1024)).toBe("1.0 ميغابايت");
  });
});
