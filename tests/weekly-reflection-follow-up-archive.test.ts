import { describe, expect, it } from "vitest";
import { getCompletedFollowUpArchive } from "../lib/weekly-reflection-follow-up-archive";

describe("أرشيف خطوات المتابعة", () => { it("يعرض المكتمل فقط ويدعم البحث النصي", () => { const archive = getCompletedFollowUpArchive([{ weekStart: "2026-01-05", note: "نص", followUpGoal: "مراجعة الإحصاء", followUpCompleted: true, followUpCompletedAt: "2026-01-10T09:00:00.000Z", updatedAt: "x" }, { weekStart: "2026-01-12", note: "نص", followUpGoal: "تلخيص الفصل", updatedAt: "x" }], "إحصاء"); expect(archive).toHaveLength(1); expect(archive[0].followUpGoal).toBe("مراجعة الإحصاء"); }); });
