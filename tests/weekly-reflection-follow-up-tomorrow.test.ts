import { describe, expect, it } from "vitest";
import { getFollowUpReviewPreparation } from "../lib/weekly-reflection-follow-up-review-prep";
import { getTomorrowFollowUpItems } from "../lib/weekly-reflection-follow-up-tomorrow";

describe("أولوية الغد وتجهيز المراجعة", () => {
  it("يعرض استحقاقات الغد فقط ويجهز جلسة 15 دقيقة للخطوة الأعلى أولوية", () => {
    const items = getTomorrowFollowUpItems([
      { weekStart: "2026-08-17", note: "", followUpGoal: "منخفضة", followUpDueAt: "2026-08-22", followUpPriority: "low", followUpSubjectId: "s1", updatedAt: "x" },
      { weekStart: "2026-08-10", note: "", followUpGoal: "عالية", followUpDueAt: "2026-08-22", followUpPriority: "high", followUpSubjectId: "s2", updatedAt: "x" },
      { weekStart: "2026-08-03", note: "", followUpGoal: "اليوم", followUpDueAt: "2026-08-21", updatedAt: "x" },
    ], new Date("2026-08-21T12:00:00.000Z"));
    expect(items.map((item) => item.followUpGoal)).toEqual(["عالية", "منخفضة"]);
    expect(getFollowUpReviewPreparation(items)).toEqual({ minutes: 15, subjectId: "s2", followUpGoal: "عالية" });
  });
});
