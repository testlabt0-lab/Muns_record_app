import type { WeeklyReflection } from "./study-types";

export function getCompletedFollowUpArchive(reflections: WeeklyReflection[], query = "") { const normalized = query.trim().toLocaleLowerCase("ar"); return [...reflections].filter((reflection) => Boolean(reflection.followUpGoal) && reflection.followUpCompleted).filter((reflection) => !normalized || `${reflection.followUpGoal} ${reflection.note}`.toLocaleLowerCase("ar").includes(normalized)).sort((a, b) => (b.followUpCompletedAt ?? b.weekStart).localeCompare(a.followUpCompletedAt ?? a.weekStart)); }
