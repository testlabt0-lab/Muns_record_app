import { describe, expect, it } from "vitest";

import { normalizeWeeklyReviewDays, normalizeWeeklyReviewReminderHour, normalizeWeeklyReviewReminderMinute } from "../lib/review-plan-reminders";

describe("أيام تذكير خطة المراجعة", () => {
  it("يحتفظ بأيام الأسبوع الصحيحة فقط من دون تكرار", () => {
    expect(normalizeWeeklyReviewDays([4, 0, 4, -1, 7, 2.5, 2])).toEqual([0, 2, 4]);
  });

  it("يعيد ساعة افتراضية آمنة عندما لا تكون ساعة التذكير صالحة", () => {
    expect(normalizeWeeklyReviewReminderHour(20)).toBe(20);
    expect(normalizeWeeklyReviewReminderHour(24)).toBe(18);
  });

  it("يعيد دقيقة افتراضية آمنة عندما لا تكون دقيقة التذكير صالحة", () => {
    expect(normalizeWeeklyReviewReminderMinute(45)).toBe(45);
    expect(normalizeWeeklyReviewReminderMinute(60)).toBe(0);
  });
});
