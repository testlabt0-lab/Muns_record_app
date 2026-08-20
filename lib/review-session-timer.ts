export function createReviewSessionEndsAt(seconds: number, now = Date.now()) {
  if (!Number.isFinite(seconds) || seconds < 1) return undefined;
  return now + Math.ceil(seconds) * 1000;
}

export function getRemainingReviewSeconds(endsAt: number | undefined, now = Date.now()) {
  if (!endsAt || !Number.isFinite(endsAt)) return 0;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}
