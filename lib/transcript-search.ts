import type { Lecture, TranscriptSegment } from "./study-types";

export interface TranscriptSearchMatch {
  text: string;
  startSeconds?: number;
  endSeconds?: number;
}

export function normalizeSearchQuery(value: string) {
  return value
    .toLocaleLowerCase("ar")
    .normalize("NFD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

function createSnippet(text: string, query: string, radius = 62) {
  const normalizedText = normalizeSearchQuery(text);
  const index = normalizedText.indexOf(query);
  if (index < 0) return text.trim().slice(0, radius * 2);
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + query.length + radius);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

function findSegmentMatches(segments: TranscriptSegment[], query: string, limit: number) {
  const matches: TranscriptSearchMatch[] = [];
  for (const segment of segments) {
    if (!normalizeSearchQuery(segment.text).includes(query)) continue;
    matches.push({ text: createSnippet(segment.text, query), startSeconds: segment.startSeconds, endSeconds: segment.endSeconds });
    if (matches.length >= limit) break;
  }
  return matches;
}

export function findTranscriptMatches(lecture: Lecture, query: string, limit = 3) {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery || !lecture.transcript) return [];
  const segmentMatches = findSegmentMatches(lecture.transcriptSegments ?? [], normalizedQuery, limit);
  if (segmentMatches.length) return segmentMatches;
  if (!normalizeSearchQuery(lecture.transcript).includes(normalizedQuery)) return [];
  return [{ text: createSnippet(lecture.transcript, normalizedQuery) }];
}
