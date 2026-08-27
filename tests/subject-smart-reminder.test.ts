import { describe, expect, it } from "vitest";

import { getSubjectSmartReminderDate, getSubjectSmartReminderTimeLabel, normalizeSubjectSmartReminder } from "../lib/subject-smart-reminder";

describe("تذكير تقدم المادة الذكي", () => {
  it("يقبل خيارات الموعد المعتمدة ويحفظها بصيغة قابلة للعرض", () => {
    const reminder = normalizeSubjectSmartReminder({ enabled: true, weekday: 6, hour: 21, minute: 30 });
    expect(reminder).toEqual({ enabled: true, weekday: 6, hour: 21, minute: 30 });
    expect(getSubjectSmartReminderTimeLabel(reminder)).toBe("الجمعة، 21:30");
  });

  it("يعيد القيم غير الصالحة إلى موعد محلي آمن افتراضي", () => {
    expect(normalizeSubjectSmartReminder({ enabled: true, weekday: 2 as 5, hour: 12, minute: 15 as 0 })).toEqual({ enabled: true, weekday: 5, hour: 19, minute: 0 });
  });

  it("يبقي الموعد داخل الأسبوع الحالي ولا يجدول تاريخاً مضى", () => {
    const reminder = { weekday: 6 as const, hour: 19, minute: 0 as const };
    expect(getSubjectSmartReminderDate(reminder, new Date("2026-08-27T12:00:00"))?.toISOString()).toContain("2026-08-28T19:00:00");
    expect(getSubjectSmartReminderDate(reminder, new Date("2026-08-29T12:00:00"))).toBeUndefined();
  });
});
