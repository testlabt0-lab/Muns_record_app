import { describe, expect, it } from "vitest";
import { getFollowUpCompletionInsights } from "../lib/weekly-reflection-follow-up-insights";

describe("مؤشرات إنجاز خطوات المتابعة", () => { it("يحسب أطول سلسلة وآخر سلسلة من الأسابيع المكتملة", () => { const insights = getFollowUpCompletionInsights([{ weekStart: "2026-01-05", note: "", followUpGoal: "أ", followUpCompleted: true, updatedAt: "x" }, { weekStart: "2026-01-12", note: "", followUpGoal: "ب", followUpCompleted: true, updatedAt: "x" }, { weekStart: "2026-01-26", note: "", followUpGoal: "ج", followUpCompleted: true, updatedAt: "x" }]); expect(insights).toMatchObject({ completedCount: 3, completionWeekCount: 3, currentWeeklyStreak: 1, bestWeeklyStreak: 2 }); }); });
