import { describe, expect, it } from "vitest";
import { createLectureNote, normalizeLectureNoteText, normalizeLectureNoteTimestamp } from "../lib/lecture-notes";

describe("ملاحظات المحاضرة", () => {
  it("ينظف النص ويمنع الملاحظة الفارغة", () => {
    expect(normalizeLectureNoteText("  فكرة   مهمة\nللامتحان ")).toBe("فكرة مهمة للامتحان");
    expect(() => normalizeLectureNoteText("   ")).toThrow("اكتب ملاحظة");
  });

  it("يقيّد الموضع الزمني ضمن مدة التسجيل", () => {
    expect(normalizeLectureNoteTimestamp(35.8, 120)).toBe(35);
    expect(normalizeLectureNoteTimestamp(900, 120)).toBe(120);
    expect(normalizeLectureNoteTimestamp(-1, 120)).toBeUndefined();
  });

  it("ينشئ ملاحظة محفوظة بالموضع والوقت", () => {
    expect(createLectureNote({ id: "note-1", text: "راجع هذا التعريف", timestampSeconds: 18, durationSeconds: 60, now: "2026-08-25T10:00:00.000Z" })).toEqual({ id: "note-1", text: "راجع هذا التعريف", timestampSeconds: 18, createdAt: "2026-08-25T10:00:00.000Z", updatedAt: "2026-08-25T10:00:00.000Z" });
  });
});
