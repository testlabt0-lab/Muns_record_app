import { describe, expect, it } from "vitest";
import { createFollowUpArchiveReportHtml } from "../lib/weekly-reflection-follow-up-archive-report";
import { getFollowUpCompletionInsights } from "../lib/weekly-reflection-follow-up-insights";

describe("تقرير أرشيف خطوات المتابعة", () => { it("يضمن عنوان الخطوة ومؤشرات الإنجاز مع حماية HTML", () => { const entries = [{ weekStart: "2026-01-05", note: "", followUpGoal: "<مراجعة>", followUpCompleted: true, followUpPriority: "high" as const, updatedAt: "x" }]; const html = createFollowUpArchiveReportHtml(entries, getFollowUpCompletionInsights(entries), () => "إحصاء", new Date("2026-01-10T09:00:00Z")); expect(html).toContain("أرشيف خطوات المتابعة"); expect(html).toContain("&lt;مراجعة&gt;"); expect(html).toContain("إحصاء"); }); });
