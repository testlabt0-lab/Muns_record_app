import { describe, expect, it } from "vitest";

import { getResumePlaybackPosition, normalizeResumablePlaybackPosition } from "../lib/lecture-playback-position";

describe("استئناف تشغيل المحاضرة", () => {
  it("يحفظ موضعاً صحيحاً بعد بداية التسجيل وقبل نهايته", () => {
    expect(normalizeResumablePlaybackPosition(45.8, 180)).toBe(45);
    expect(getResumePlaybackPosition(120, 180)).toBe(120);
  });

  it("يتجاهل المواضع غير المفيدة عند البداية أو قرب النهاية", () => {
    expect(normalizeResumablePlaybackPosition(4, 180)).toBeUndefined();
    expect(normalizeResumablePlaybackPosition(175, 180)).toBeUndefined();
    expect(getResumePlaybackPosition(undefined, 180)).toBeUndefined();
  });

  it("يرفض المدة أو الموضع غير الصالح", () => {
    expect(normalizeResumablePlaybackPosition(Number.NaN, 180)).toBeUndefined();
    expect(normalizeResumablePlaybackPosition(20, 0)).toBeUndefined();
    expect(normalizeResumablePlaybackPosition(-20, 180)).toBeUndefined();
  });
});
