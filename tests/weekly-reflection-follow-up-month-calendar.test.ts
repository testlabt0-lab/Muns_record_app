import { describe, expect, it } from "vitest";
import { getFollowUpMonthCalendar } from "../lib/weekly-reflection-follow-up-month-calendar";

describe("التقويم الشهري لخطوات المتابعة", () => { it("ينشئ شبكة ستة أسابيع ويضع الخطوة في يوم استحقاقها", () => { const calendar = getFollowUpMonthCalendar([{ weekStart: "2026-01-05", note: "ن", followUpGoal: "مراجعة", followUpDueAt: "2026-01-15", updatedAt: "x", isOverdue: false }], new Date(2026, 0, 1)); expect(calendar.cells).toHaveLength(42); expect(calendar.cells.find((cell) => cell.date === "2026-01-15")?.items[0].followUpGoal).toBe("مراجعة"); }); });
