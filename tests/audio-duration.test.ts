import { describe, expect, it } from "vitest";
import { applyDetectedDuration, normalizeDetectedDuration } from "../lib/audio-duration";

const part = { id: "audio-1", index: 1, uri: "file://recording.m4a", durationSeconds: 0, createdAt: "2026-08-20T00:00:00.000Z" };

describe("اكتشاف مدة التسجيل", () => {
  it("يرفض المدة غير الصالحة ولا يعرض تقديراً", () => {
    expect(normalizeDetectedDuration(0)).toBe(0);
    expect(normalizeDetectedDuration(Number.NaN)).toBe(0);
    expect(normalizeDetectedDuration(61.8)).toBe(61);
  });

  it("يحفظ المدة الحقيقية مرة واحدة بعد تحميل الوسيط", () => {
    expect(applyDetectedDuration([part], 0, 125)).toEqual({ audioParts: [{ ...part, durationSeconds: 125 }], durationSeconds: 125 });
    expect(applyDetectedDuration([{ ...part, durationSeconds: 45 }], 0, 125)).toBeNull();
  });
});
