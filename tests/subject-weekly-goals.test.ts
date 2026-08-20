import { describe, expect, it } from "vitest";

import { getSubjectWeeklyGoalProgress, getWeeklyGoalPercent, normalizeWeeklyGoalTargets } from "../lib/subject-weekly-goals";

describe("أهداف المادة الأسبوعية", () => {
  it("يحفظ قيماً سليمة ويحسب مراجعة وتركيز المادة منذ بداية الأسبوع", () => {
    expect(normalizeWeeklyGoalTargets({ reviewTarget: -1, focusMinutesTarget: 30 })).toEqual({ reviewTarget: 0, focusMinutesTarget: 30 });
    const progress = getSubjectWeeklyGoalProgress("s", "2026-01-05T00:00:00.000Z", [{ id: "l", subjectId: "s", section: "theory", title: "ل", durationSeconds: 1, recordedAt: "2026", transcriptionStatus: "local", summaryStatus: "local" }], [{ id: "c", lectureId: "l", question: "س", answer: "ج", dueAt: "2026", intervalDays: 1, repetitions: 0, lastReviewedAt: "2026-01-06" }], [{ id: "x", subjectId: "s", durationMinutes: 20, completedAt: "2026-01-07" }]);
    expect(progress).toEqual({ reviewedCardCount: 1, focusMinutes: 20 });
    expect(getWeeklyGoalPercent(20, 30)).toBe(67);
  });
});
