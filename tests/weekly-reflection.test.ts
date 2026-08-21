import { describe, expect, it } from "vitest";
import { createNextWeeklyFollowUpRepeat, normalizeWeeklyReflection } from "../lib/weekly-reflection";

describe("الملاحظة الختامية للأسبوع", () => {
  it("ينظف النص ويحده بالألف حرف قبل الحفظ", () => {
    const value = normalizeWeeklyReflection("2026-01-05", `  ${"م".repeat(1005)}  `, "x");
    expect(value.note).toHaveLength(1000); expect(value.updatedAt).toBe("x");
  });
  it("يحفظ التقييم ونقاط التركيز المعروفة فقط", () => {
    const value = normalizeWeeklyReflection("2026-01-05", "تقدم جيد", { rating: 4, focusAreas: ["focus", "review", "غير معروف" as never] }, "x");
    expect(value.rating).toBe(4); expect(value.focusAreas).toEqual(["focus", "review"]);
  });
  it("يحفظ هدف متابعة قصيراً ولا يسمح بإتمام هدف فارغ", () => {
    const completed = normalizeWeeklyReflection("2026-01-05", "تقدم", { followUpGoal: "مراجعة الفصل الأول", followUpCompleted: true }, "x");
    const empty = normalizeWeeklyReflection("2026-01-05", "تقدم", { followUpCompleted: true }, "x");
    expect(completed.followUpCompleted).toBe(true); expect(completed.followUpCompletedAt).toBe("x"); expect(empty.followUpCompleted).toBe(false);
  });
  it("يحفظ أولوية واستحقاق هدف المتابعة عند وجوده", () => { const value = normalizeWeeklyReflection("2026-01-05", "تقدم", { followUpGoal: "خطوة", followUpPriority: "high", followUpDueAt: "2026-01-09" }, "x"); expect(value.followUpPriority).toBe("high"); expect(value.followUpDueAt).toBe("2026-01-09"); });
  it("يربط هدف المتابعة بمعرف مادة صالح", () => { const value = normalizeWeeklyReflection("2026-01-05", "تقدم", { followUpGoal: "خطوة", followUpSubjectId: "subject-1" }, "x"); expect(value.followUpSubjectId).toBe("subject-1"); });
  it("يحفظ خيار التكرار الأسبوعي للهدف الموجود", () => { const value = normalizeWeeklyReflection("2026-01-05", "تقدم", { followUpGoal: "خطوة", followUpRepeatsWeekly: true }, "x"); expect(value.followUpRepeatsWeekly).toBe(true); });
  it("ينشئ نسخة أسبوعية جديدة بلا استحقاق قديم للهدف المتكرر", () => { const value = normalizeWeeklyReflection("2026-01-05", "تقدم", { followUpGoal: "خطوة", followUpPriority: "high", followUpDueAt: "2026-01-08", followUpRepeatsWeekly: true }, "x"); const next = createNextWeeklyFollowUpRepeat(value); expect(next).toMatchObject({ weekStart: "2026-01-12", followUpGoal: "خطوة", followUpPriority: "high", followUpRepeatsWeekly: true }); expect(next?.followUpDueAt).toBeUndefined(); });
});
