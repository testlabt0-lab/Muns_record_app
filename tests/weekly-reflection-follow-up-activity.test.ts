import { describe, expect, it } from "vitest";
import { getFollowUpActivityDraft } from "../lib/weekly-reflection-follow-up-activity";

describe("سجل نشاط خطوات المتابعة", () => {
  const base = { weekStart: "2026-08-17", note: "", followUpGoal: "حل المسائل", followUpDueAt: "2026-08-21", followUpPriority: "medium" as const, updatedAt: "x" };
  it("يسجل الإنشاء والإتمام وإعادة الفتح والتأجيل ولا يسجل الحفظ المطابق", () => {
    expect(getFollowUpActivityDraft(undefined, base, "2026-08-17T10:00:00.000Z")?.type).toBe("created");
    expect(getFollowUpActivityDraft(base, { ...base, followUpCompleted: true }, "2026-08-21T10:00:00.000Z")?.type).toBe("completed");
    expect(getFollowUpActivityDraft({ ...base, followUpCompleted: true }, base, "2026-08-22T10:00:00.000Z")?.type).toBe("reopened");
    expect(getFollowUpActivityDraft(base, { ...base, followUpDueAt: "2026-08-24" }, "2026-08-21T10:00:00.000Z")?.type).toBe("postponed");
    expect(getFollowUpActivityDraft(base, base, "2026-08-21T10:00:00.000Z")).toBeUndefined();
  });
});
