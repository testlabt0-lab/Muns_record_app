import type { LectureAudioPart } from "./study-types";

export function normalizeDetectedDuration(seconds: number | null | undefined) {
  if (!Number.isFinite(seconds) || !seconds || seconds < 1) return 0;
  return Math.floor(seconds);
}

export function applyDetectedDuration(parts: LectureAudioPart[], partIndex: number, seconds: number) {
  const durationSeconds = normalizeDetectedDuration(seconds);
  if (!durationSeconds || !parts[partIndex] || parts[partIndex].durationSeconds > 0) return null;
  const updatedParts = parts.map((part, index) => index === partIndex ? { ...part, durationSeconds } : part);
  return { audioParts: updatedParts, durationSeconds: updatedParts.reduce((total, part) => total + part.durationSeconds, 0) };
}
