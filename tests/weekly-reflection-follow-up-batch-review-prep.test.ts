import { describe, expect, it } from "vitest";

import { getManagedFollowUpItems } from "../lib/weekly-reflection-follow-up-manager";
import { getFollowUpBatchReviewPreparation } from "../lib/weekly-reflection-follow-up-batch-review-prep";

describe("تجهيز مراجعة الخطوات الجماعية", () => {
  it("يختار المادة الأكثر حضوراً ويكيّف مدة الجلسة مع عدد الخطوات", () => {
    const items = getManagedFollowUpItems([
      { weekStart: "2026-08-17", note: "", followUpGoal: "رياضيات 1", followUpSubjectId: "math", followUpPriority: "medium", updatedAt: "x" },
      { weekStart: "2026-08-10", note: "", followUpGoal: "رياضيات 2", followUpSubjectId: "math", followUpPriority: "low", updatedAt: "x" },
      { weekStart: "2026-08-03", note: "", followUpGoal: "فيزياء", followUpSubjectId: "physics", followUpPriority: "high", updatedAt: "x" },
      { weekStart: "2026-07-27", note: "", followUpGoal: "بلا مادة", followUpPriority: "high", updatedAt: "x" },
    ]).filter((item) => item.status === "open");

    expect(getFollowUpBatchReviewPreparation(items)).toEqual({ minutes: 25, subjectId: "math", selectedCount: 4, subjectCount: 2 });
    expect(getFollowUpBatchReviewPreparation([])).toBeUndefined();
  });

  it("يحسم تعادل عدد الخطوات بالأولوية ثم بأقرب استحقاق", () => {
    const priorityWinner = getManagedFollowUpItems([
      { weekStart: "2026-08-17", note: "", followUpGoal: "كيمياء", followUpSubjectId: "chemistry", followUpPriority: "medium", updatedAt: "x" },
      { weekStart: "2026-08-10", note: "", followUpGoal: "أحياء", followUpSubjectId: "biology", followUpPriority: "high", updatedAt: "x" },
    ]).filter((item) => item.status === "open");
    const dueWinner = getManagedFollowUpItems([
      { weekStart: "2026-08-17", note: "", followUpGoal: "تفاضل", followUpSubjectId: "calculus", followUpPriority: "high", followUpDueAt: "2026-08-29", updatedAt: "x" },
      { weekStart: "2026-08-10", note: "", followUpGoal: "هندسة", followUpSubjectId: "geometry", followUpPriority: "high", followUpDueAt: "2026-08-28", updatedAt: "x" },
    ]).filter((item) => item.status === "open");

    expect(getFollowUpBatchReviewPreparation(priorityWinner)?.subjectId).toBe("biology");
    expect(getFollowUpBatchReviewPreparation(dueWinner)).toEqual({ minutes: 15, subjectId: "geometry", selectedCount: 2, subjectCount: 2 });
  });

  it("ينشئ مراجعة عامة للخطوات غير المرتبطة ويستخدم 45 دقيقة للقائمة الكبيرة", () => {
    const items = getManagedFollowUpItems([
      { weekStart: "2026-08-17", note: "", followUpGoal: "خطوة 1", updatedAt: "x" },
      { weekStart: "2026-08-10", note: "", followUpGoal: "خطوة 2", updatedAt: "x" },
      { weekStart: "2026-08-03", note: "", followUpGoal: "خطوة 3", updatedAt: "x" },
      { weekStart: "2026-07-27", note: "", followUpGoal: "خطوة 4", updatedAt: "x" },
      { weekStart: "2026-07-20", note: "", followUpGoal: "خطوة 5", updatedAt: "x" },
    ]).filter((item) => item.status === "open");

    expect(getFollowUpBatchReviewPreparation(items)).toEqual({ minutes: 45, selectedCount: 5, subjectCount: 0 });
  });
});
