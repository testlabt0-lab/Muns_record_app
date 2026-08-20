import { describe, expect, it } from "vitest";

import { buildTermProgressComparison, compareTermMetric } from "../lib/term-progress-comparison";

describe("مقارنة تقدم الترمين", () => {
  it("تحسب المحاضرات والمراجعة والتركيز لكل ترم من المواد المنتمية إليه", () => {
    const terms = [{ id: "one", yearId: "y", kind: "first" as const, title: "الأول", createdAt: "2026" }, { id: "two", yearId: "y", kind: "second" as const, title: "الثاني", createdAt: "2026" }];
    const result = buildTermProgressComparison(terms, [{ id: "s1", termId: "one", title: "أ", color: "#000", hasPracticalSection: false, theoryInstructor: "د", createdAt: "2026" }, { id: "s2", termId: "two", title: "ب", color: "#000", hasPracticalSection: false, theoryInstructor: "د", createdAt: "2026" }], [{ id: "l1", subjectId: "s1", section: "theory", title: "ل", durationSeconds: 1, recordedAt: "2026", transcriptionStatus: "local", summaryStatus: "local" }], [{ id: "r", lectureId: "l1", question: "س", answer: "ج", dueAt: "2026", intervalDays: 1, repetitions: 0, lastReviewedAt: "2026" }], [{ id: "rs", subjectId: "s2", durationMinutes: 25, completedAt: "2026" }]);
    expect(result.map((item) => [item.lectureCount, item.reviewedCardCount, item.focusMinutes])).toEqual([[1, 1, 0], [0, 0, 25]]);
    expect(compareTermMetric(25, 10)).toBe(15);
  });
});
