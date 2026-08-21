import type { WeeklyReflection } from "./study-types";

export function getWeeklyReflectionArchive(reflections: WeeklyReflection[], query = "", limit = 12) { const needle = query.trim().toLocaleLowerCase("ar"); return [...reflections].filter((reflection) => reflection.note.trim().length > 0).filter((reflection) => !needle || reflection.note.toLocaleLowerCase("ar").includes(needle)).sort((a, b) => b.weekStart.localeCompare(a.weekStart)).slice(0, limit); }
export function getWeeklyReflectionCount(reflections: WeeklyReflection[]) { return reflections.filter((reflection) => reflection.note.trim().length > 0).length; }
