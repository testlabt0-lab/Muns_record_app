import { describe, expect, it } from "vitest";

import { getNearSubjectGoalMetrics } from "../lib/subject-goal-reminder";

describe("تنبيه اقتراب هدف المادة", () => {
  it("يعرض مؤشرات تجاوزت 80٪ ولم تكتمل بعد", () => {
    const result = getNearSubjectGoalMetrics({ lectureCount: 8, recordingMinutes: 0, transcribedCount: 0, summarizedCount: 0, reviewCardCount: 0, reviewedCardCount: 9, focusMinutes: 100, taskCount: 0, completedTaskCount: 0 }, { subjectId: "s", lectureTarget: 10, reviewTarget: 10, focusMinutesTarget: 100, updatedAt: "2026" });
    expect(result.map((item) => item.label)).toEqual(["المحاضرات", "بطاقات المراجعة"]);
  });
});
