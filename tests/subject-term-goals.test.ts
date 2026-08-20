import { describe, expect, it } from "vitest";

import { normalizeSubjectTermGoalTargets } from "../lib/subject-term-goals";

describe("أهداف المادة الفصلية", () => {
  it("يقبل الأهداف الصحيحة ويمنع القيم الفارغة أو غير المعقولة", () => {
    expect(normalizeSubjectTermGoalTargets({ lectureTarget: 12, reviewTarget: 30, focusMinutesTarget: 240 })).toEqual({ lectureTarget: 12, reviewTarget: 30, focusMinutesTarget: 240 });
    expect(() => normalizeSubjectTermGoalTargets({ lectureTarget: 0, reviewTarget: 0, focusMinutesTarget: 0 })).toThrow("هدفاً واحداً");
  });
});
