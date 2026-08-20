export function formatBookmarkTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const remainder = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function normalizeBookmark(label: string, seconds: number, durationSeconds?: number) {
  const safeDuration = Number.isFinite(durationSeconds) && durationSeconds && durationSeconds > 0 ? Math.floor(durationSeconds) : undefined;
  const safeSeconds = Math.max(0, Math.min(Math.floor(Number.isFinite(seconds) ? seconds : 0), safeDuration ?? Number.MAX_SAFE_INTEGER));
  const cleanedLabel = label.trim().replace(/\s+/g, " ").slice(0, 80);
  return { label: cleanedLabel || `إشارة عند ${formatBookmarkTime(safeSeconds)}`, seconds: safeSeconds };
}
