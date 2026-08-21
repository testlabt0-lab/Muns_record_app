import type { Subject, WeeklyReflection } from "./study-types";

export type FollowUpSubjectComparison = {
  subjectId: string;
  title: string;
  color: string;
  totalCount: number;
  completedCount: number;
  openCount: number;
  completionPercent: number;
};

export function getFollowUpSubjectComparison(reflections: WeeklyReflection[], subjects: Subject[]): FollowUpSubjectComparison[] {
  const availableSubjects = new Map(subjects.map((subject) => [subject.id, subject]));
  const counts = new Map<string, { totalCount: number; completedCount: number }>();

  reflections.forEach((reflection) => {
    const subjectId = reflection.followUpSubjectId;
    if (!subjectId || !reflection.followUpGoal || !availableSubjects.has(subjectId)) return;
    const current = counts.get(subjectId) ?? { totalCount: 0, completedCount: 0 };
    counts.set(subjectId, { totalCount: current.totalCount + 1, completedCount: current.completedCount + (reflection.followUpCompleted ? 1 : 0) });
  });

  return Array.from(counts.entries()).map(([subjectId, count]) => {
    const subject = availableSubjects.get(subjectId)!;
    return {
      subjectId,
      title: subject.title,
      color: subject.color,
      totalCount: count.totalCount,
      completedCount: count.completedCount,
      openCount: count.totalCount - count.completedCount,
      completionPercent: Math.round(count.completedCount / count.totalCount * 100),
    };
  }).sort((first, second) => second.completionPercent - first.completionPercent || second.completedCount - first.completedCount || second.totalCount - first.totalCount || first.title.localeCompare(second.title, "ar"));
}
