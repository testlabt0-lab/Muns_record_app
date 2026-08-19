import { describe, expect, it } from "vitest";

import { deriveApiBaseUrlFromHost } from "../lib/api-url";
import { allowedSections, createActiveAcademicYear, deactivateAcademicYears, findOrCreateTerm, lectureSectionIsValid, normalizeRequiredTitle } from "../lib/study-domain";

describe("قواعد تنظيم المحتوى الدراسي", () => {
  it("ينشئ سنة نشطة ويلغي تنشيط السنوات السابقة", () => {
    const older = createActiveAcademicYear("y-1", "2025–2026", "2025-09-01T00:00:00.000Z");
    const newest = createActiveAcademicYear("y-2", "2026–2027", "2026-09-01T00:00:00.000Z");

    expect(deactivateAcademicYears([older]).every((year) => !year.isActive)).toBe(true);
    expect(newest).toMatchObject({ title: "2026–2027", isActive: true, archived: false });
  });

  it("لا ينشئ ترماً مكرراً داخل السنة نفسها", () => {
    const first = findOrCreateTerm([], "year-1", "first", "term-1", "2026-09-01T00:00:00.000Z");
    const repeated = findOrCreateTerm([first.term], "year-1", "first", "term-2", "2026-09-02T00:00:00.000Z");

    expect(first).toMatchObject({ isNew: true, term: { title: "الترم الأول" } });
    expect(repeated).toMatchObject({ isNew: false, term: { id: "term-1" } });
  });

  it("يسمح بالقسم العملي للمادة العملية فقط", () => {
    expect(allowedSections({ hasPracticalSection: true })).toEqual(["theory", "practical"]);
    expect(lectureSectionIsValid({ hasPracticalSection: false }, "theory")).toBe(true);
    expect(lectureSectionIsValid({ hasPracticalSection: false }, "practical")).toBe(false);
  });

  it("يرفض العناوين الفارغة بعد التنسيق", () => {
    expect(() => normalizeRequiredTitle("   ", "اسم المادة")).toThrow("اكتب اسم المادة أولاً.");
  });

  it("يشتق عنوان خدمة التحويل من رابط Expo Go على الهاتف", () => {
    expect(deriveApiBaseUrlFromHost("8081-sandbox.region.manus.computer")).toBe("https://3000-sandbox.region.manus.computer");
    expect(deriveApiBaseUrlFromHost("https://8081-sandbox.region.manus.computer/path")).toBe("https://3000-sandbox.region.manus.computer");
  });
});
