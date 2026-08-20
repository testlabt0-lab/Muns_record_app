import { describe, expect, it } from "vitest";

import { createSubjectGoalsBackupJson, parseSubjectGoalsBackupJson, restoreSubjectGoalsForKnownSubjects } from "../lib/subject-goals-backup";

describe("نسخة إعدادات أهداف المواد", () => {
  it("يقرأ النسخة ويستعيد فقط أهداف المواد المعروفة", () => {
    const backup = parseSubjectGoalsBackupJson(createSubjectGoalsBackupJson([{ subjectId: "known", lectureTarget: 3, reviewTarget: 4, focusMinutesTarget: 50, updatedAt: "2026" }, { subjectId: "missing", lectureTarget: 1, reviewTarget: 1, focusMinutesTarget: 1, updatedAt: "2026" }], []));
    expect(restoreSubjectGoalsForKnownSubjects(backup, ["known"]).subjectGoals).toHaveLength(1);
  });
});
