import { describe, expect, it } from "vitest";

import { normalizeAppearanceMode } from "../lib/appearance-preference";

describe("تفضيل مظهر التطبيق", () => {
  it("يحافظ على الوضع الليلي ويعيد القيم غير المعروفة إلى الوضع الفاتح", () => {
    expect(normalizeAppearanceMode("dark")).toBe("dark");
    expect(normalizeAppearanceMode("light")).toBe("light");
    expect(normalizeAppearanceMode("system")).toBe("light");
    expect(normalizeAppearanceMode(undefined)).toBe("light");
  });
});
