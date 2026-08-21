import { describe, expect, it } from "vitest";
import { createWeeklyReflectionArchiveReportHtml } from "../lib/weekly-reflection-archive-report";

describe("تقرير أرشيف الملاحظات", () => { it("ينشئ تقريراً عربياً وينظف نص الملاحظة", () => { const html = createWeeklyReflectionArchiveReportHtml([{ weekStart: "2026-01-05", note: "<خطة> الإحصاء", rating: 5, focusAreas: ["organization"], updatedAt: "x" }], new Date("2026-01-10T10:00:00Z")); expect(html).toContain("أرشيف الملاحظات الأسبوعية"); expect(html).toContain("&lt;خطة&gt; الإحصاء"); expect(html).toContain("تقييم 5/5"); expect(html).toContain("التنظيم"); expect(html).toContain("1 ملاحظة مكتوبة"); }); });
