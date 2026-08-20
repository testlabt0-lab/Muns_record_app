import { describe, expect, it } from "vitest";
import { buildMergedTranscript, getTranscriptionProgress, mergeTranscribedPart } from "../lib/transcription-progress";

describe("تقدم تحويل المحاضرات متعددة الأجزاء", () => {
  it("يستبدل الجزء نفسه بدلاً من تكراره عند إعادة المحاولة", () => {
    const first = mergeTranscribedPart([], { sourceId: "part-1", text: "النص الأول", segments: [] }, "2026-08-20T10:00:00.000Z");
    const retried = mergeTranscribedPart(first, { sourceId: "part-1", text: "النص المصحح", segments: [] }, "2026-08-20T10:05:00.000Z");
    expect(retried).toHaveLength(1);
    expect(retried[0].text).toBe("النص المصحح");
  });

  it("يدمج الأجزاء بترتيب الملف الأصلي ويحافظ على المواضع الزمنية", () => {
    const parts = [
      { sourceId: "part-2", text: "النص الثاني", segments: [{ id: "s2", text: "ثانٍ", startSeconds: 30, endSeconds: 35 }], completedAt: "2026-08-20T10:00:00.000Z" },
      { sourceId: "part-1", text: "النص الأول", segments: [{ id: "s1", text: "أول", startSeconds: 0, endSeconds: 4 }], completedAt: "2026-08-20T09:00:00.000Z" },
    ];
    const result = buildMergedTranscript(parts, ["part-1", "part-2"]);
    expect(result.transcript).toBe("الجزء 1\nالنص الأول\n\nالجزء 2\nالنص الثاني");
    expect(result.segments.map((segment) => segment.id)).toEqual(["s1", "s2"]);
  });

  it("يحسب التقدم من الأجزاء المكتملة فقط", () => {
    expect(getTranscriptionProgress([{ sourceId: "part-1", text: "نص", segments: [], completedAt: "2026-08-20T09:00:00.000Z" }], 4)).toBe(25);
    expect(getTranscriptionProgress([], 0)).toBe(0);
  });
});
