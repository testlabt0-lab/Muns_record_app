import { describe, expect, it } from "vitest";

import { buildSubjectFollowUps } from "../lib/subject-follow-up";

describe("لوحة متابعة المواد", () => {
  it("ترتب المواد الأقل تقدماً أولاً وتوضح المادة بلا هدف", () => {
    const result = buildSubjectFollowUps({ subjects: [{ id: "a", termId: "t", title: "أ", color: "#000", hasPracticalSection: false, theoryInstructor: "د", createdAt: "2026" }, { id: "b", termId: "t", title: "ب", color: "#000", hasPracticalSection: false, theoryInstructor: "د", createdAt: "2026" }], subjectGoals: [{ subjectId: "a", lectureTarget: 10, reviewTarget: 0, focusMinutesTarget: 0, updatedAt: "2026" }], lectures: [], reviewCards: [], reviewSessions: [], tasks: [] });
    expect(result.map((item) => item.subject.id)).toEqual(["b", "a"]);
    expect(result[0].status).toBe("unplanned");
    expect(result[1].status).toBe("critical");
  });
});
