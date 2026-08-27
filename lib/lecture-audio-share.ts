import type { LectureAudioPart } from "./study-types";

export function getActiveAudioPartForShare(parts: LectureAudioPart[], activeIndex: number) {
  if (!Number.isInteger(activeIndex) || activeIndex < 0 || activeIndex >= parts.length) return undefined;
  return parts[activeIndex];
}

export function getAudioShareMimeType(uri: string) {
  const pathname = uri.split("?")[0].toLowerCase();
  if (pathname.endsWith(".mp3")) return "audio/mpeg";
  if (pathname.endsWith(".wav")) return "audio/wav";
  if (pathname.endsWith(".aac")) return "audio/aac";
  if (pathname.endsWith(".ogg")) return "audio/ogg";
  return "audio/mp4";
}
