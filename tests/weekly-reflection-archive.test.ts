import { describe, expect, it } from "vitest";
import { getWeeklyReflectionArchive, getWeeklyReflectionCount } from "../lib/weekly-reflection-archive";

describe("أرشيف الملاحظات الأسبوعية", () => {
  const reflections = [{ weekStart: "2026-01-05", note: "أحتاج مراجعة الإحصاء", updatedAt: "a" }, { weekStart: "2026-01-12", note: "تحسن التركيز هذا الأسبوع", updatedAt: "b" }, { weekStart: "2026-01-19", note: "  ", updatedAt: "c" }];
  it("يرتب الملاحظات المكتوبة حديثاً ويبحث داخل النص", () => { expect(getWeeklyReflectionArchive(reflections).map((item) => item.weekStart)).toEqual(["2026-01-12", "2026-01-05"]); expect(getWeeklyReflectionArchive(reflections, "إحصاء")).toHaveLength(1); });
  it("يحسب الأسابيع التي تحتوي على ملاحظة فقط", () => { expect(getWeeklyReflectionCount(reflections)).toBe(2); });
});
