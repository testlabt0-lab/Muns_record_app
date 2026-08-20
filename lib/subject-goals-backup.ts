import type { SubjectTermGoal, SubjectWeeklyGoal } from "./study-types";

export interface SubjectGoalsBackup {
  schema: "muhadir-subject-goals-v1";
  createdAt: string;
  subjectGoals: SubjectTermGoal[];
  weeklySubjectGoals: SubjectWeeklyGoal[];
}

export function createSubjectGoalsBackupJson(subjectGoals: SubjectTermGoal[], weeklySubjectGoals: SubjectWeeklyGoal[]) {
  return JSON.stringify({ schema: "muhadir-subject-goals-v1", createdAt: new Date().toISOString(), subjectGoals, weeklySubjectGoals } satisfies SubjectGoalsBackup, null, 2);
}

export function parseSubjectGoalsBackupJson(value: string): SubjectGoalsBackup {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error("ملف أهداف غير صالح."); }
  if (!parsed || typeof parsed !== "object") throw new Error("ملف أهداف غير صالح.");
  const candidate = parsed as Partial<SubjectGoalsBackup>;
  if (candidate.schema !== "muhadir-subject-goals-v1" || !Array.isArray(candidate.subjectGoals) || !Array.isArray(candidate.weeklySubjectGoals)) throw new Error("هذا الملف ليس نسخة أهداف مُحاضِر مدعومة.");
  const subjectGoals = candidate.subjectGoals.filter((goal): goal is SubjectTermGoal => Boolean(goal && typeof goal.subjectId === "string" && Number.isFinite(goal.lectureTarget) && Number.isFinite(goal.reviewTarget) && Number.isFinite(goal.focusMinutesTarget)));
  const weeklySubjectGoals = candidate.weeklySubjectGoals.filter((goal): goal is SubjectWeeklyGoal => Boolean(goal && typeof goal.subjectId === "string" && typeof goal.weekStart === "string" && Number.isFinite(goal.reviewTarget) && Number.isFinite(goal.focusMinutesTarget)));
  return { schema: candidate.schema, createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : new Date().toISOString(), subjectGoals, weeklySubjectGoals };
}

export function restoreSubjectGoalsForKnownSubjects(backup: SubjectGoalsBackup, subjectIds: string[]) {
  const known = new Set(subjectIds);
  return { subjectGoals: backup.subjectGoals.filter((goal) => known.has(goal.subjectId)), weeklySubjectGoals: backup.weeklySubjectGoals.filter((goal) => known.has(goal.subjectId)) };
}
