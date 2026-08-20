import { describe, expect, it } from "vitest";
import { findTranscriptMatches, normalizeSearchQuery } from "../lib/transcript-search";
import type { Lecture } from "../lib/study-types";

const lecture: Lecture = {
  id: "lecture-1", subjectId: "subject-1", section: "theory", title: "محاضرة البحث", recordedAt: "2026-08-21T10:00:00.000Z", durationSeconds: 240,
  transcriptionStatus: "completed", summaryStatus: "ready", transcript: "مقدمة قصيرة ثم نتحدث عن خوارزمية البحث الثنائي ودقتها.",
  transcriptSegments: [
    { id: "segment-1", text: "مقدمة قصيرة", startSeconds: 0, endSeconds: 12 },
    { id: "segment-2", text: "نتحدث عن خوارزمية البحث الثنائي ودقتها", startSeconds: 12, endSeconds: 35 },
  ],
};

describe("البحث داخل تفريغات المحاضرات", () => {
  it("يطبع الحروف العربية قبل المقارنة", () => {
    expect(normalizeSearchQuery("إِجْرَاء  البحث")).toBe("اجراء البحث");
  });

  it("يعيد مقتطفًا وموقعًا زمنيًا للمقطع المطابق", () => {
    expect(findTranscriptMatches(lecture, "البحث الثنائي")).toEqual([
      { text: "نتحدث عن خوارزمية البحث الثنائي ودقتها", startSeconds: 12, endSeconds: 35 },
    ]);
  });

  it("يعود إلى النص الكامل عندما لا تتوفر مقاطع زمنية", () => {
    const withoutSegments = { ...lecture, transcriptSegments: [] };
    expect(findTranscriptMatches(withoutSegments, "خوارزمية")[0]).toMatchObject({ text: expect.stringContaining("خوارزمية") });
    expect(findTranscriptMatches(withoutSegments, "غير موجود")).toEqual([]);
  });

  it("يحافظ على استجابة البحث مع تفريغ طويل", () => {
    const segments = Array.from({ length: 1_200 }, (_, index) => ({ id: `segment-${index}`, text: index === 1_199 ? "المقطع الأخير يحتوي كلمة استقرار" : `محتوى المحاضرة رقم ${index} مع شرح تفصيلي`, startSeconds: index * 8, endSeconds: index * 8 + 7 }));
    const longLecture = { ...lecture, transcript: segments.map((segment) => segment.text).join(" "), transcriptSegments: segments };
    const startedAt = performance.now();
    const matches = findTranscriptMatches(longLecture, "استقرار");
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ startSeconds: 1_199 * 8 });
    expect(performance.now() - startedAt).toBeLessThan(500);
  });
});
