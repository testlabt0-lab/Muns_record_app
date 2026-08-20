import { describe, expect, it } from "vitest";

import { normalizeWeeklyReviewDays } from "../lib/review-plan-reminders";

describe("أيام تذكير خطة المراجعة", () => {
  it("يحتفظ بأيام الأسبوع الصحيحة فقط من دون تكرار", () => {
    expect(normalizeWeeklyReviewDays([4, 0, 4, -1, 7, 2.5, 2])).toEqual([0, 2, 4]);
  });
});
