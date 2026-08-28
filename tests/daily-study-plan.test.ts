import { describe, expect, it } from "vitest";
import { getDailyStudyPlan } from "../lib/daily-study-plan";

describe("خطة اليوم الدراسية", () => {
  it("ترتب البطاقات المستحقة ثم خطوات المتابعة ثم التحويل والتلخيص", () => {
    const items = getDailyStudyPlan({ now: new Date("2026-08-28T10:00:00"), reviewCards: [{ id: "card-1", lectureId: "lecture-1", question: "س", answer: "ج", dueAt: "2026-08-28", intervalDays: 1, repetitions: 0 }], followUps: [{ weekStart: "2026-08-24", note: "", updatedAt: "2026-08-28", followUpGoal: "راجع التعريف", followUpDueAt: "2026-08-28", followUpSubjectId: "subject-1", followUpPriority: "high", isOverdue: false }], lectures: [{ id: "lecture-1", subjectId: "subject-1", section: "theory", title: "الأولى", recordedAt: "2026-08-28", durationSeconds: 30, audioUri: "file://one.m4a", transcriptionStatus: "ready", summaryStatus: "ready" }, { id: "lecture-2", subjectId: "subject-2", section: "theory", title: "الثانية", recordedAt: "2026-08-28", durationSeconds: 30, transcript: "نص المحاضرة", transcriptionStatus: "completed", summaryStatus: "ready" }] });
    expect(items.map((item) => item.action)).toEqual(["review", "follow-up", "transcribe"]);
    expect(items[0].subjectId).toBe("subject-1");
  });

  it("لا يعرض خطة وهمية عندما لا توجد إجراءات معلقة", () => {
    expect(getDailyStudyPlan({ reviewCards: [], followUps: [], lectures: [] })).toEqual([]);
  });
});
