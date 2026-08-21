import { describe, expect, it } from "vitest";
import { normalizeWeeklyReflection } from "../lib/weekly-reflection";

describe("الملاحظة الختامية للأسبوع", () => {
  it("ينظف النص ويحده بالألف حرف قبل الحفظ", () => {
    const value = normalizeWeeklyReflection("2026-01-05", `  ${"م".repeat(1005)}  `, "x");
    expect(value.note).toHaveLength(1000); expect(value.updatedAt).toBe("x");
  });
  it("يحفظ التقييم ونقاط التركيز المعروفة فقط", () => {
    const value = normalizeWeeklyReflection("2026-01-05", "تقدم جيد", { rating: 4, focusAreas: ["focus", "review", "غير معروف" as never] }, "x");
    expect(value.rating).toBe(4); expect(value.focusAreas).toEqual(["focus", "review"]);
  });
});
