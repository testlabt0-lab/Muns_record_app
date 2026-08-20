import type { TranscriptSegment, TranscribedAudioPart } from "@/lib/study-types";

export type RawTranscriptPart = {
  sourceId: string;
  text: string;
  segments: TranscriptSegment[];
};

export function mergeTranscribedPart(existing: TranscribedAudioPart[] | undefined, incoming: RawTranscriptPart, completedAt = new Date().toISOString()): TranscribedAudioPart[] {
  const nextPart: TranscribedAudioPart = { ...incoming, completedAt };
  const current = existing ?? [];
  const index = current.findIndex((part) => part.sourceId === incoming.sourceId);
  if (index === -1) return [...current, nextPart];
  return current.map((part, partIndex) => partIndex === index ? nextPart : part);
}

export function buildMergedTranscript(parts: TranscribedAudioPart[], audioPartIds: string[]) {
  const bySource = new Map(parts.map((part) => [part.sourceId, part]));
  const ordered = audioPartIds.map((sourceId) => bySource.get(sourceId)).filter((part): part is TranscribedAudioPart => Boolean(part));
  return {
    transcript: ordered.map((part, index) => audioPartIds.length > 1 ? `الجزء ${index + 1}\n${part.text}` : part.text).join("\n\n"),
    segments: ordered.flatMap((part) => part.segments),
  };
}

export function getTranscriptionProgress(completedParts: TranscribedAudioPart[] | undefined, totalParts: number) {
  if (!totalParts) return 0;
  return Math.min(100, Math.round(((completedParts?.length ?? 0) / totalParts) * 100));
}
