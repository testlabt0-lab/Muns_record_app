import { describe, expect, it } from "vitest";
import { getFollowUpMonthlyGoalProgress, getFollowUpStreakBreakStatus, normalizeFollowUpMonthlyTarget, shouldNotifyFollowUpStreakBreak } from "../lib/weekly-reflection-follow-up-monthly-goal";

describe("هدف المتابعة الشهري", () => {
  it("يحسب الخطوات المكتملة في الشهر الحالي من تاريخ الإتمام", () => {
    const progress = getFollowUpMonthlyGoalProgress([
      { weekStart: "2026-07-27", note: "", followUpGoal: "أ", followUpCompleted: true, followUpCompletedAt: "2026-08-02T12:00:00.000Z", updatedAt: "x" },
      { weekStart: "2026-08-03", note: "", followUpGoal: "ب", followUpCompleted: true, followUpCompletedAt: "2026-08-12T12:00:00.000Z", updatedAt: "x" },
      { weekStart: "2026-08-17", note: "", followUpGoal: "ج", followUpCompleted: true, followUpCompletedAt: "2026-09-01T12:00:00.000Z", updatedAt: "x" },
      { weekStart: "2026-08-10", note: "", followUpGoal: "د", followUpCompleted: false, updatedAt: "x" },
    ], 3, new Date("2026-08-21T12:00:00.000Z"));

    expect(progress).toMatchObject({ monthKey: "2026-08", target: 3, completedCount: 2, remainingCount: 1, percent: 67, isReached: false });
  });

  it("يعتمد أربعة أهداف كقيمة افتراضية عند إدخال هدف غير صالح", () => {
    expect(normalizeFollowUpMonthlyTarget(0)).toBe(4);
    expect(normalizeFollowUpMonthlyTarget(5)).toBe(5);
  });
});

describe("انقطاع سلسلة متابعة الأهداف", () => {
  it("يكتشف الأسبوع الفائت غير المكتمل بعد وجود إنجاز سابق ويمنع تكرار التنبيه", () => {
    const status = getFollowUpStreakBreakStatus([
      { weekStart: "2026-08-03T00:00:00.000Z", note: "", followUpGoal: "أ", followUpCompleted: true, updatedAt: "x" },
    ], new Date("2026-08-21T12:00:00.000Z"));

    expect(status).toMatchObject({ isBroken: true, missedWeekStart: "2026-08-10T00:00:00.000Z", lastCompletedWeekStart: "2026-08-03T00:00:00.000Z" });
    expect(shouldNotifyFollowUpStreakBreak(true, undefined, status)).toBe(true);
    expect(shouldNotifyFollowUpStreakBreak(true, "2026-08-10T00:00:00.000Z", status)).toBe(false);
  });

  it("لا يعتبر السلسلة منقطعة عند إنجاز خطوة خلال الأسبوع الحالي", () => {
    const status = getFollowUpStreakBreakStatus([
      { weekStart: "2026-08-03T00:00:00.000Z", note: "", followUpGoal: "أ", followUpCompleted: true, updatedAt: "x" },
      { weekStart: "2026-08-17T00:00:00.000Z", note: "", followUpGoal: "ب", followUpCompleted: true, updatedAt: "x" },
    ], new Date("2026-08-21T12:00:00.000Z"));

    expect(status.isBroken).toBe(false);
  });
});
