import { describe, expect, it } from "vitest";
import { getTodayFollowUpItems, getTodayFollowUpSummary } from "../lib/weekly-reflection-follow-up-today";

describe("لوحة خطوات المتابعة لليوم", () => {
  it("تجمع المتأخر والمستحق اليوم فقط وبترتيب المتأخر أولاً", () => {
    const items = getTodayFollowUpItems([
      { weekStart: "2026-08-17", note: "", followUpGoal: "اليوم", followUpDueAt: "2026-08-21", followUpPriority: "low", updatedAt: "x" },
      { weekStart: "2026-08-10", note: "", followUpGoal: "متأخرة", followUpDueAt: "2026-08-20", followUpPriority: "medium", updatedAt: "x" },
      { weekStart: "2026-08-24", note: "", followUpGoal: "قادمة", followUpDueAt: "2026-08-22", followUpPriority: "high", updatedAt: "x" },
      { weekStart: "2026-08-03", note: "", followUpGoal: "بلا موعد", updatedAt: "x" },
      { weekStart: "2026-07-27", note: "", followUpGoal: "مكتملة", followUpCompleted: true, followUpDueAt: "2026-08-20", updatedAt: "x" },
    ], new Date("2026-08-21T12:00:00.000Z"));
    expect(items.map((item) => item.followUpGoal)).toEqual(["متأخرة", "اليوم"]);
    expect(getTodayFollowUpSummary(items)).toEqual({ total: 2, overdueCount: 1, dueTodayCount: 1 });
  });
});
