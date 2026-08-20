import { describe, expect, it } from "vitest";

import { compareWeeklyPerformance } from "../lib/review-performance";

describe("compareWeeklyPerformance", () => {
  it("يفصل بيانات آخر سبعة أيام عن الأسبوع الذي يسبقه", () => {
    const now = new Date("2026-08-20T12:00:00.000Z").getTime();
    const result = compareWeeklyPerformance(
      [
        { id: "current", durationMinutes: 30, completedAt: "2026-08-18T12:00:00.000Z" },
        { id: "previous", durationMinutes: 15, completedAt: "2026-08-10T12:00:00.000Z" },
        { id: "old", durationMinutes: 45, completedAt: "2026-08-05T12:00:00.000Z" },
      ],
      [
        { id: "current-card", lectureId: "lecture", question: "س", answer: "ج", dueAt: "2026-08-21T12:00:00.000Z", intervalDays: 1, repetitions: 1, lastReviewedAt: "2026-08-19T12:00:00.000Z" },
        { id: "previous-card", lectureId: "lecture", question: "س", answer: "ج", dueAt: "2026-08-21T12:00:00.000Z", intervalDays: 1, repetitions: 1, lastReviewedAt: "2026-08-11T12:00:00.000Z" },
        { id: "unreviewed", lectureId: "lecture", question: "س", answer: "ج", dueAt: "2026-08-21T12:00:00.000Z", intervalDays: 1, repetitions: 0 },
      ],
      now,
    );

    expect(result).toEqual({ focusCurrent: 30, focusPrevious: 15, cardsCurrent: 1, cardsPrevious: 1 });
  });
});
