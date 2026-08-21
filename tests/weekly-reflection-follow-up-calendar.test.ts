import { describe, expect, it } from "vitest";
import { getFollowUpCalendar } from "../lib/weekly-reflection-follow-up-calendar";

describe("تقويم خطوات المتابعة", () => { it("يجمع الخطوات المفتوحة حسب الاستحقاق خلال الأسبوع القادم", () => { const calendar = getFollowUpCalendar([{ weekStart: "2026-01-05", note: "ن", followUpGoal: "مراجعة", followUpDueAt: "2026-01-06", updatedAt: "x", isOverdue: false }], new Date("2026-01-05T10:00:00Z")); expect(calendar).toHaveLength(7); expect(calendar[1].items[0].followUpGoal).toBe("مراجعة"); }); });
