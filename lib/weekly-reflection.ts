import type { WeeklyReflection } from "./study-types";

export function normalizeWeeklyReflection(weekStart: string, note: string, updatedAt = new Date().toISOString()): WeeklyReflection { return { weekStart, note: note.trim().slice(0, 1000), updatedAt }; }
