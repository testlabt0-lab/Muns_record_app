import { describe, expect, it } from "vitest";
import { getWeeklyReflectionInsights } from "../lib/weekly-reflection-insights";

describe("مؤشرات السجل الانعكاسي", () => { it("يحسب متوسط التقييم ونقطة التركيز الأبرز والاتجاه", () => { const insights = getWeeklyReflectionInsights([{ weekStart: "2026-01-05", note: "أ", rating: 3, focusAreas: ["focus"], updatedAt: "x" }, { weekStart: "2026-01-12", note: "ب", rating: 5, focusAreas: ["focus", "review"], updatedAt: "x" }]); expect(insights.averageRating).toBe(4); expect(insights.leadingFocus).toBe("focus"); expect(insights.trend).toHaveLength(2); }); });
