import type { SubjectTermGoal } from "./study-types";
import type { SubjectProgress } from "./subject-progress";

/** يعيد مؤشرات الهدف التي وصلت إلى 80٪ ولم تكتمل بعد، كي لا يُرسل تنبيه إنجاز مكرر. */
export function getNearSubjectGoalMetrics(progress: SubjectProgress, goal: SubjectTermGoal) {
  const metrics = [{ label: "المحاضرات", current: progress.lectureCount, target: goal.lectureTarget }, { label: "بطاقات المراجعة", current: progress.reviewedCardCount, target: goal.reviewTarget }, { label: "دقائق التركيز", current: progress.focusMinutes, target: goal.focusMinutesTarget }];
  return metrics.filter((metric) => metric.target > 0 && metric.current / metric.target >= 0.8 && metric.current < metric.target);
}
