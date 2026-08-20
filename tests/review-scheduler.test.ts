import { describe, expect, it } from "vitest";
import { isReviewDue, scheduleReview } from "../lib/review-scheduler";
import type { ReviewCard } from "../lib/study-types";

const card: ReviewCard = {
  id: "review-1",
  lectureId: "lecture-1",
  question: "ما الفكرة؟",
  answer: "الفكرة الأساسية",
  dueAt: "2026-08-20T00:00:00.000Z",
  intervalDays: 4,
  repetitions: 2,
};

describe("جدولة المراجعة المتباعدة", () => {
  const now = new Date("2026-08-20T12:00:00.000Z");

  it("تجعل البطاقة المستعجلة مستحقة خلال يوم وتعيد التكرارات للصفر", () => {
    const result = scheduleReview(card, "again", now);
    expect(result.intervalDays).toBe(1);
    expect(result.repetitions).toBe(0);
    expect(result.dueAt).toBe("2026-08-21T12:00:00.000Z");
  });

  it("تمنح الإجابة السهلة فترة أطول من الإجابة الجيدة", () => {
    expect(scheduleReview(card, "easy", now).intervalDays).toBeGreaterThan(scheduleReview(card, "good", now).intervalDays);
  });

  it("تحدد ما إذا كانت البطاقة مستحقة الآن", () => {
    expect(isReviewDue(card, now)).toBe(true);
    expect(isReviewDue({ ...card, dueAt: "2026-08-21T00:00:00.000Z" }, now)).toBe(false);
  });
});
