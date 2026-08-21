import { describe, expect, it } from "vitest";
import { getFollowUpDueOptions, normalizeFollowUpPriority } from "../lib/weekly-reflection-follow-up";

describe("خصائص هدف المتابعة", () => { it("ينشئ خيارات استحقاق محلية ويعيد أولوية افتراضية", () => { const options = getFollowUpDueOptions(new Date("2026-01-05T10:00:00Z")); expect(options).toHaveLength(4); expect(options[1].dueAt).toBe("2026-01-06"); expect(normalizeFollowUpPriority("غير معروف")).toBe("medium"); }); });
