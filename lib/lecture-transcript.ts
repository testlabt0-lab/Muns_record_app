import type { Lecture, TranscriptLanguage } from "@/lib/study-types";

export const TRANSCRIPT_LANGUAGE_OPTIONS: { value: TranscriptLanguage; label: string }[] = [
  { value: "ar", label: "العربية" },
  { value: "en", label: "الإنجليزية" },
  { value: "mixed", label: "عربي + إنجليزي" },
];

export function getLectureTranscript(lecture: Pick<Lecture, "transcript" | "transcriptEditedText">) {
  return lecture.transcriptEditedText?.trim() || lecture.transcript || "";
}

export function normalizeEditedTranscript(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function getTranscriptLanguageLabel(language: TranscriptLanguage | undefined) {
  return TRANSCRIPT_LANGUAGE_OPTIONS.find((item) => item.value === language)?.label ?? "العربية";
}
