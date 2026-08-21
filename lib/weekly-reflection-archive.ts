import type { WeeklyReflection } from "./study-types";

export type WeeklyReflectionRange = "all" | "four-weeks" | "three-months";
function getRangeStart(range: WeeklyReflectionRange, now: Date) { if (range === "four-weeks") return new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString(); if (range === "three-months") { const value = new Date(now); value.setMonth(value.getMonth() - 3); return value.toISOString(); } return undefined; }
export function getWeeklyReflectionArchive(reflections: WeeklyReflection[], query = "", limit = 12, range: WeeklyReflectionRange = "all", now = new Date()) { const needle = query.trim().toLocaleLowerCase("ar"); const rangeStart = getRangeStart(range, now); return [...reflections].filter((reflection) => reflection.note.trim().length > 0).filter((reflection) => !rangeStart || reflection.weekStart >= rangeStart).filter((reflection) => !needle || reflection.note.toLocaleLowerCase("ar").includes(needle)).sort((a, b) => b.weekStart.localeCompare(a.weekStart)).slice(0, limit); }
export function getWeeklyReflectionCount(reflections: WeeklyReflection[]) { return reflections.filter((reflection) => reflection.note.trim().length > 0).length; }
