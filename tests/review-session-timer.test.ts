import { describe, expect, it } from "vitest";
import { createReviewSessionEndsAt, getRemainingReviewSeconds } from "../lib/review-session-timer";

describe("مؤقت جلسة المراجعة", () => {
  it("يحسب وقت الانتهاء من مدة الجلسة", () => {
    expect(createReviewSessionEndsAt(90, 1_000)).toBe(91_000);
    expect(createReviewSessionEndsAt(0, 1_000)).toBeUndefined();
  });

  it("يعيد الوقت الحقيقي المتبقي ولا يسمح بالقيم السالبة", () => {
    expect(getRemainingReviewSeconds(91_000, 45_250)).toBe(46);
    expect(getRemainingReviewSeconds(91_000, 91_200)).toBe(0);
  });
});
