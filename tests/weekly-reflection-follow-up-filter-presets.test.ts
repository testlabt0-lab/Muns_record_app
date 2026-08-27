import { describe, expect, it } from "vitest";
import { createFollowUpFilterPreset } from "../lib/weekly-reflection-follow-up-filter-presets";

describe("الفلاتر المفضلة لخطوات المتابعة", () => {
  it("تنشئ فلترًا قابلاً للحفظ وتمنع الاسم الفارغ", () => {
    expect(createFollowUpFilterPreset("p1", " عاجل هذا الأسبوع ", { status: "open", sort: "priority", subjectFilter: "math", priorityFilter: "high", dueFilter: "week" }, "2026-08-21T10:00:00.000Z")).toMatchObject({ id: "p1", title: "عاجل هذا الأسبوع", status: "open", dueFilter: "week" });
    expect(createFollowUpFilterPreset("p2", "   ", { status: "all", sort: "smart", subjectFilter: "all", priorityFilter: "all", dueFilter: "all" }, "2026-08-21T10:00:00.000Z")).toBeUndefined();
  });
});
