const MIN_RESUMABLE_SECONDS = 5;
const END_GUARD_SECONDS = 5;

export function normalizeResumablePlaybackPosition(seconds: number | undefined, durationSeconds: number) {
  if (seconds === undefined || !Number.isFinite(seconds) || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return undefined;
  const position = Math.floor(Math.max(0, seconds));
  const duration = Math.floor(durationSeconds);
  if (position < MIN_RESUMABLE_SECONDS || position >= duration - END_GUARD_SECONDS) return undefined;
  return Math.min(position, duration);
}

export function getResumePlaybackPosition(savedSeconds: number | undefined, durationSeconds: number) {
  return normalizeResumablePlaybackPosition(savedSeconds, durationSeconds);
}
