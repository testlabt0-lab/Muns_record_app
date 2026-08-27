import type { FollowUpActivity, Subject, WeeklyReflection } from "./study-types";

export type FollowUpSubjectTimingInsight = {
  subject: Subject;
  measuredCompletionCount: number;
  averageCompletionHours?: number;
  postponementCount: number;
  averagePostponementsPerCompleted?: number;
};

export function buildFollowUpSubjectTimingInsights(subjects: Subject[], reflections: WeeklyReflection[], activities: FollowUpActivity[]): FollowUpSubjectTimingInsight[] {
  return subjects.map((subject) => {
    const subjectSteps = reflections.filter((item) => item.followUpSubjectId === subject.id && item.followUpGoal);
    const durations = subjectSteps.map((item) => {
      if (!item.followUpCompletedAt || !item.followUpCreatedAt) return undefined;
      const createdAt = new Date(item.followUpCreatedAt).getTime();
      const completedAt = new Date(item.followUpCompletedAt).getTime();
      return Number.isFinite(createdAt) && Number.isFinite(completedAt) && completedAt >= createdAt ? Math.round((completedAt - createdAt) / 3_600_000) : undefined;
    }).filter((value): value is number => value !== undefined);
    const postponementCount = activities.filter((activity) => activity.subjectId === subject.id && activity.type === "postponed").length;
    const measuredCompletionCount = durations.length;
    return { subject, measuredCompletionCount, averageCompletionHours: measuredCompletionCount ? Math.round(durations.reduce((total, hours) => total + hours, 0) / measuredCompletionCount) : undefined, postponementCount, averagePostponementsPerCompleted: measuredCompletionCount ? Math.round((postponementCount / measuredCompletionCount) * 10) / 10 : undefined };
  }).filter((item) => item.measuredCompletionCount || item.postponementCount).sort((first, second) => second.postponementCount - first.postponementCount || (second.averageCompletionHours ?? 0) - (first.averageCompletionHours ?? 0));
}

export function formatFollowUpCompletionTime(hours: number | undefined) {
  if (hours === undefined) return "—";
  return hours >= 24 ? `${Math.round(hours / 24)} ي` : `${hours} س`;
}
