import type { Lecture, LectureNote } from "@/lib/study-types";

export function normalizeLinkedNote(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 800);
}

export function createLinkedLectureNote(id: string, text: string, timestampSeconds: number | undefined, createdAt: string): LectureNote | undefined {
  const normalized = normalizeLinkedNote(text);
  if (!normalized) return undefined;
  const hasTimestamp = typeof timestampSeconds === "number" && Number.isFinite(timestampSeconds) && timestampSeconds >= 0;
  return { id, text: normalized, timestampSeconds: hasTimestamp ? Math.floor(timestampSeconds) : undefined, source: hasTimestamp ? "audio" : "manual", createdAt, updatedAt: createdAt };
}

export function getLectureReviewSourceSummary(lecture: Pick<Lecture, "transcript" | "transcriptEditedText" | "summary" | "notes" | "attachments">) {
  return {
    transcript: Boolean(lecture.transcriptEditedText?.trim() || lecture.transcript),
    summary: Boolean(lecture.summary),
    notes: lecture.notes?.length ?? 0,
    extractedAttachments: (lecture.attachments ?? []).filter((attachment) => Boolean(attachment.extractedText)).length,
  };
}

export function createReviewCardFromLinkedNote(note: LectureNote) {
  const source = note.timestampSeconds === undefined ? "ملاحظة عامة" : `ملاحظة عند ${Math.floor(note.timestampSeconds / 60)}:${String(note.timestampSeconds % 60).padStart(2, "0")}`;
  return { question: `ماذا تتذكر من ${source}؟`, answer: note.text };
}
