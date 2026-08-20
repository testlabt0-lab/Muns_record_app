import { describe, expect, it } from "vitest";
import { formatBookmarkTime, normalizeBookmark } from "../lib/lecture-bookmarks";

describe("إشارات المحاضرة الزمنية", () => {
  it("ينشئ عنوانًا مفهومًا عند ترك العنوان فارغًا", () => {
    expect(formatBookmarkTime(65.8)).toBe("01:05");
    expect(normalizeBookmark("", 65.8)).toEqual({ label: "إشارة عند 01:05", seconds: 65 });
  });

  it("ينظف العنوان ويقيّد الموضع بمدة التسجيل", () => {
    expect(normalizeBookmark("  تعريف   مهم  ", 500, 180)).toEqual({ label: "تعريف مهم", seconds: 180 });
  });
});
