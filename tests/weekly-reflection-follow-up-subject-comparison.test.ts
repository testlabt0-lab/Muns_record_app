import { describe, expect, it } from "vitest";
import { getFollowUpSubjectComparison } from "../lib/weekly-reflection-follow-up-subject-comparison";

const subjects = [
  { id: "math", termId: "term", title: "رياضيات", color: "#2563EB", hasPracticalSection: false, theoryInstructor: "م", createdAt: "x" },
  { id: "physics", termId: "term", title: "فيزياء", color: "#F97316", hasPracticalSection: true, theoryInstructor: "ف", createdAt: "x" },
];

describe("مقارنة إنجاز خطوات المتابعة بين المواد", () => {
  it("يحسب الإنجاز والخطوات المفتوحة ويرتب المواد بالأعلى إنجازاً", () => {
    const comparison = getFollowUpSubjectComparison([
      { weekStart: "2026-08-03", note: "", followUpGoal: "حل مسائل", followUpSubjectId: "math", followUpCompleted: true, updatedAt: "x" },
      { weekStart: "2026-08-10", note: "", followUpGoal: "مراجعة فصل", followUpSubjectId: "math", followUpCompleted: false, updatedAt: "x" },
      { weekStart: "2026-08-17", note: "", followUpGoal: "تجربة", followUpSubjectId: "physics", followUpCompleted: true, updatedAt: "x" },
      { weekStart: "2026-08-24", note: "", followUpGoal: "غير مرتبط", followUpCompleted: true, updatedAt: "x" },
      { weekStart: "2026-08-31", note: "", followUpGoal: "مادة محذوفة", followUpSubjectId: "missing", followUpCompleted: true, updatedAt: "x" },
    ], subjects);

    expect(comparison).toEqual([
      { subjectId: "physics", title: "فيزياء", color: "#F97316", totalCount: 1, completedCount: 1, openCount: 0, completionPercent: 100 },
      { subjectId: "math", title: "رياضيات", color: "#2563EB", totalCount: 2, completedCount: 1, openCount: 1, completionPercent: 50 },
    ]);
  });
});
