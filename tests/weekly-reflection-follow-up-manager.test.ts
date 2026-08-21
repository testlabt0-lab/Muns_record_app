import { describe, expect, it } from "vitest";
import { getFollowUpManagerCounts, getManagedFollowUpItems, getReopenedFollowUpAttributes, normalizeFollowUpManagerEdit } from "../lib/weekly-reflection-follow-up-manager";

describe("قائمة إدارة خطوات المتابعة", () => {
  const reflections = [
    { weekStart: "2026-08-03", note: "ملاحظة اختبار", followUpGoal: "خطوة متأخرة", followUpDueAt: "2026-08-10", followUpPriority: "low" as const, updatedAt: "x" },
    { weekStart: "2026-08-10", note: "", followUpGoal: "خطوة عالية", followUpDueAt: "2026-08-25", followUpPriority: "high" as const, updatedAt: "x" },
    { weekStart: "2026-08-17", note: "تلخيص فصل", followUpGoal: "خطوة مكتملة", followUpCompleted: true, followUpCompletedAt: "2026-08-22T12:00:00.000Z", followUpPriority: "medium" as const, updatedAt: "x" },
  ];

  it("يعرض المفتوح أولاً ويرتب المتأخر ثم الأولوية ويبحث في العنوان والملاحظة", () => {
    const items = getManagedFollowUpItems(reflections, "", "all", new Date("2026-08-21T12:00:00.000Z"));
    expect(items.map((item) => item.followUpGoal)).toEqual(["خطوة متأخرة", "خطوة عالية", "خطوة مكتملة"]);
    expect(getManagedFollowUpItems(reflections, "تلخيص", "all", new Date("2026-08-21T12:00:00.000Z")).map((item) => item.followUpGoal)).toEqual(["خطوة مكتملة"]);
    expect(getFollowUpManagerCounts(items)).toEqual({ open: 2, completed: 1 });
  });

  it("يبني سمات إعادة فتح الخطوة مع حفظ المادة والأولوية والاستحقاق", () => {
    const attributes = getReopenedFollowUpAttributes({ ...reflections[2], followUpSubjectId: "subject-1", followUpRepeatsWeekly: true });
    expect(attributes).toMatchObject({ followUpGoal: "خطوة مكتملة", followUpCompleted: false, followUpCompletedAt: undefined, followUpSubjectId: "subject-1", followUpRepeatsWeekly: true });
  });

  it("يدعم الفرز بالأحدث والأولوية والموعد مع التحقق من تعديل العنوان والموعد", () => {
    expect(getManagedFollowUpItems(reflections, "", "all", new Date("2026-08-21T12:00:00.000Z"), "recent").map((item) => item.followUpGoal)).toEqual(["خطوة مكتملة", "خطوة عالية", "خطوة متأخرة"]);
    expect(getManagedFollowUpItems(reflections, "", "open", new Date("2026-08-21T12:00:00.000Z"), "priority").map((item) => item.followUpGoal)).toEqual(["خطوة عالية", "خطوة متأخرة"]);
    expect(getManagedFollowUpItems(reflections, "", "open", new Date("2026-08-21T12:00:00.000Z"), "due").map((item) => item.followUpGoal)).toEqual(["خطوة متأخرة", "خطوة عالية"]);
    expect(normalizeFollowUpManagerEdit("  عنوان معدّل  ", "2026-09-01")).toEqual({ followUpGoal: "عنوان معدّل", followUpDueAt: "2026-09-01" });
    expect(normalizeFollowUpManagerEdit("   ", "2026-09-01")).toBeUndefined();
  });
});
