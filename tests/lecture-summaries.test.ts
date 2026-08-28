import { describe, expect, it } from "vitest";
import { createSummaryVersion, getLectureSummaryVersions, validateLectureSummaryDraft } from "../lib/lecture-summaries";

describe("نسخ ملخص المحاضرة", () => {
  it("يتحقق من البنية قبل حفظ الملخص المحرر محلياً", () => {
    expect(validateLectureSummaryDraft({ overview: "قصير", keyPoints: "نقطة", terms: "مصطلح", reviewQuestions: "سؤال" })).toBeUndefined();
    expect(validateLectureSummaryDraft({ overview: "هذه نظرة عامة صالحة ومفيدة للمحاضرة", keyPoints: "نقطة أولى\nنقطة ثانية", terms: "مصطلح", reviewQuestions: "سؤال أول\nسؤال ثانٍ" })).toEqual({ overview: "هذه نظرة عامة صالحة ومفيدة للمحاضرة", keyPoints: ["نقطة أولى", "نقطة ثانية"], terms: ["مصطلح"], reviewQuestions: ["سؤال أول", "سؤال ثانٍ"] });
  });

  it("يحفظ نسخة AI بأسلوبها ويعيد الملخص القديم كنسخة قابلة للاستمرار", () => {
    const summary = { overview: "نظرة عامة صالحة", keyPoints: ["أول", "ثان"], terms: [], reviewQuestions: ["س1", "س2"] };
    expect(getLectureSummaryVersions({ summary, recordedAt: "2026-08-27" })).toEqual([{ id: "legacy-summary", style: "quick", summary, source: "ai", createdAt: "2026-08-27" }]);
    expect(createSummaryVersion(summary, "exam", "2026-08-28", "summary-1")).toEqual({ id: "summary-1", style: "exam", summary, source: "ai", createdAt: "2026-08-28" });
  });
});
