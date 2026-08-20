import { getSubjectProgress, type SubjectProgress } from "./subject-progress";
import type { StudyStore, Subject, SubjectTermGoal } from "./study-types";

export type SubjectFollowUpStatus = "critical" | "attention" | "on-track" | "unplanned";
export interface SubjectFollowUp { subject: Subject; goal?: SubjectTermGoal; progress: SubjectProgress; percent: number; status: SubjectFollowUpStatus; reason: string; }

function calculateGoalPercent(progress: SubjectProgress, goal: SubjectTermGoal) {
  const values = [{ current: progress.lectureCount, target: goal.lectureTarget }, { current: progress.reviewedCardCount, target: goal.reviewTarget }, { current: progress.focusMinutes, target: goal.focusMinutesTarget }].filter((item) => item.target > 0);
  return values.length ? Math.round(values.reduce((sum, item) => sum + Math.min(100, Math.round(item.current / item.target * 100)), 0) / values.length) : 0;
}

/** يرتب المواد محلياً بحسب فجوة التقدم الفعلية والهدف المحفوظ، من الأشد احتياجاً للمتابعة أولاً. */
export function buildSubjectFollowUps(store: Pick<StudyStore, "subjects" | "subjectGoals" | "lectures" | "reviewCards" | "reviewSessions" | "tasks">): SubjectFollowUp[] {
  const priority: Record<SubjectFollowUpStatus, number> = { unplanned: 0, critical: 1, attention: 2, "on-track": 3 };
  return store.subjects.map((subject): SubjectFollowUp => { const goal = (store.subjectGoals ?? []).find((item) => item.subjectId === subject.id); const progress = getSubjectProgress(subject.id, store.lectures, store.reviewCards, store.reviewSessions ?? [], store.tasks); if (!goal) return { subject, progress, percent: 0, status: "unplanned", reason: "لا يوجد هدف محفوظ لهذه المادة" }; const percent = calculateGoalPercent(progress, goal); const status: SubjectFollowUpStatus = percent < 40 ? "critical" : percent < 80 ? "attention" : "on-track"; const reason = status === "critical" ? "تقدم الهدف ما زال منخفضاً" : status === "attention" ? "تحتاج إلى جلسة قصيرة لتقترب من الهدف" : "تسير ضمن هدف الترم"; return { subject, goal, progress, percent, status, reason }; }).sort((a, b) => priority[a.status] - priority[b.status] || a.percent - b.percent || a.subject.title.localeCompare(b.subject.title, "ar"));
}

export function filterSubjectFollowUpsByTerm(items: SubjectFollowUp[], termId?: string) { return termId ? items.filter((item) => item.subject.termId === termId) : items; }
