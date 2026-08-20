import { describe, expect, it } from "vitest";

import { getStudyDataImportPreview, mergeStudyDataImport, parseStudyDataImportJson } from "../lib/study-data-import";
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

  it("يكشف العناصر المضافة والمكررة أو التي تحتاج ارتباطاً مفقوداً قبل الدمج", () => {
    const incoming = parseStudyDataImportJson(JSON.stringify({ format: "muhadir-study-data", schemaVersion: 1, data: { years: [], terms: [], subjects: [], lectures: [{ id: "same", subjectId: "missing", section: "theory", title: "مكرر", recordedAt: "2026", durationSeconds: 0, transcriptionStatus: "local", summaryStatus: "local" }, { id: "new", subjectId: "missing", section: "theory", title: "محاضرة", recordedAt: "2026", durationSeconds: 0, transcriptionStatus: "local", summaryStatus: "local" }], reviewCards: [], reviewLists: [], reviewSessions: [], reviewChallenges: [], tasks: [] } }));
    const current = { ...baseStore, lectures: [{ id: "same", subjectId: "current-year", section: "theory" as const, title: "حالية", recordedAt: "2026", durationSeconds: 0, transcriptionStatus: "local" as const, summaryStatus: "local" as const }] };
    expect(getStudyDataImportPreview(current, incoming, ["lectures"]).lectures).toEqual({ incoming: 2, additions: 0, duplicates: 1, blocked: 1 });
  });
});
