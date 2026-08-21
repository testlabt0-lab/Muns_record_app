import { describe, expect, it } from "vitest";
import { createFollowUpBatchUndoSnapshot, restoreFollowUpBatchUndoSnapshot } from "../lib/weekly-reflection-follow-up-batch-undo";
import type { WeeklyReflection } from "../lib/study-types";

describe("تراجع إجراءات خطوات المتابعة الجماعية", () => {
  it("يحفظ نسخة مستقلة ويستعيدها دون إضافة تكرارات أسبوعية", () => {
    const reflections: WeeklyReflection[] = [{ weekStart: "2026-08-17", note: "", focusAreas: ["review"], followUpGoal: "خطوة متكررة", followUpCompleted: false, followUpRepeatsWeekly: true, updatedAt: "x" }];
    const snapshot = createFollowUpBatchUndoSnapshot(reflections, "complete", 1);
    reflections[0].focusAreas?.push("focus");
    const restored = restoreFollowUpBatchUndoSnapshot(snapshot);
    expect(snapshot.action).toBe("complete");
    expect(snapshot.count).toBe(1);
    expect(restored).toEqual([{ weekStart: "2026-08-17", note: "", focusAreas: ["review"], followUpGoal: "خطوة متكررة", followUpCompleted: false, followUpRepeatsWeekly: true, updatedAt: "x" }]);
    expect(restored).toHaveLength(1);
  });
});
