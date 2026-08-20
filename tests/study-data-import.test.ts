import { describe, expect, it } from "vitest";

import { mergeStudyDataImport, parseStudyDataImportJson } from "../lib/study-data-import";
import type { StudyStore } from "../lib/study-types";

const baseStore: StudyStore = { years: [{ id: "current-year", title: "الحالية", isActive: true, archived: false, createdAt: "2026" }], terms: [], subjects: [], lectures: [], reviewCards: [], reviewLists: [], reviewSessions: [], reviewChallenges: [], tasks: [], backupActivities: [], syncSettings: { cloudBackupEnabled: false } };

describe("استيراد بيانات الدراسة", () => {
  it("يتحقق من مخطط مُحاضِر ويستورد الفئات المختارة من دون استبدال محتوى الجهاز", () => {
    const source = JSON.stringify({ format: "muhadir-study-data", schemaVersion: 1, data: { years: [{ id: "imported-year", title: "مستوردة", isActive: false, archived: false, createdAt: "2025" }], terms: [{ id: "term", yearId: "imported-year", kind: "first", title: "الأول", createdAt: "2025" }], subjects: [{ id: "subject", termId: "term", title: "مادة", color: "#000", hasPracticalSection: false, theoryInstructor: "د", createdAt: "2025" }], lectures: [{ id: "lecture", subjectId: "subject", section: "theory", title: "محاضرة", recordedAt: "2025", durationSeconds: 0, audioUri: "file:///elsewhere/audio", transcriptionStatus: "local", summaryStatus: "local" }], reviewCards: [], reviewLists: [], reviewSessions: [], reviewChallenges: [], tasks: [] } });
    const imported = parseStudyDataImportJson(source);
    const merged = mergeStudyDataImport(baseStore, imported, ["structure", "lectures"]);
    expect(merged.years).toHaveLength(2);
    expect(merged.lectures).toHaveLength(1);
    expect(merged.lectures[0].audioUri).toBeUndefined();
  });

  it("يرفض الملفات التي لا تطابق المخطط المعتمد", () => {
    expect(() => parseStudyDataImportJson('{"format":"unknown"}')).toThrow("ليس نسخة بيانات صالحة");
  });
});
