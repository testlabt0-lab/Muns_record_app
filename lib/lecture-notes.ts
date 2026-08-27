import type { LectureNote } from "./study-types";

export function normalizeLectureNoteText(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) throw new Error("اكتب ملاحظة قبل الحفظ.");
  if (text.length > 1_000) throw new Error("اجعل الملاحظة أقصر من 1000 حرف.");
  return text;
}

export function normalizeLectureNoteTimestamp(seconds: number | undefined, durationSeconds: number) {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return undefined;
  const upperBound = Math.max(0, Math.floor(durationSeconds));
  return Math.min(Math.floor(seconds), upperBound);
}

export function createLectureNote(input: { id: string; text: string; timestampSeconds?: number; durationSeconds: number; now: string }): LectureNote {
  return {
    id: input.id,
    text: normalizeLectureNoteText(input.text),
    timestampSeconds: normalizeLectureNoteTimestamp(input.timestampSeconds, input.durationSeconds),
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export function updateLectureNote(note: LectureNote, text: string, now: string): LectureNote {
  return { ...note, text: normalizeLectureNoteText(text), updatedAt: now };
}
