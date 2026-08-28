import { describe, expect, it } from "vitest";
import { createLinkedLectureNote, createReviewCardFromLinkedNote, getLectureReviewSourceSummary } from "../lib/lecture-linked-notes";

describe("الملاحظات المترابطة", () => {
  it("ينشئ ملاحظة مرتبطة بزمن التسجيل أو يرفض النص الفارغ", () => {
    expect(createLinkedLectureNote("note-1", "  تعريف مهم  ", 75.8, "2026-08-28")).toMatchObject({ id: "note-1", text: "تعريف مهم", timestampSeconds: 75, source: "audio" });
    expect(createLinkedLectureNote("note-2", "   ", 3, "2026-08-28")).toBeUndefined();
  });

  it("يبني بطاقة مراجعة ومؤشرات مصادر فعلية للمحاضرة", () => {
    const note = createLinkedLectureNote("note-1", "عرّف العصب الحائر", 75, "2026-08-28")!;
    expect(createReviewCardFromLinkedNote(note)).toEqual({ question: "ماذا تتذكر من ملاحظة عند 1:15؟", answer: "عرّف العصب الحائر" });
    expect(getLectureReviewSourceSummary({ transcript: "نص", summary: { overview: "ملخص", keyPoints: [], terms: [], reviewQuestions: [] }, notes: [note], attachments: [{ extractedText: "صورة" }] as never[] })).toEqual({ transcript: true, summary: true, notes: 1, extractedAttachments: 1 });
  });
});
