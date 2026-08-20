import { describe, expect, it } from "vitest";

import { createStudyDataExport, createStudyDataExportJson } from "../lib/study-data-export";
import type { StudyStore } from "../lib/study-types";

const store: StudyStore = {
  years: [{ id: "year", title: "2026", isActive: true, archived: false, createdAt: "2026-01-01" }], terms: [], subjects: [], reviewCards: [], reviewLists: [], reviewSessions: [], reviewChallenges: [], tasks: [], backupActivities: [],
  lectures: [{ id: "lecture", subjectId: "subject", section: "theory", title: "محاضرة", recordedAt: "2026-08-20", durationSeconds: 10, audioUri: "file:///private/audio.m4a", audioParts: [{ id: "part", index: 1, uri: "file:///private/audio.m4a", durationSeconds: 10, createdAt: "2026-08-20" }], attachments: [{ id: "attachment", lectureId: "lecture", kind: "pdf", title: "ملف", uri: "file:///private/file.pdf", mimeType: "application/pdf", createdAt: "2026-08-20" }], transcript: "نص المحاضرة", transcriptionStatus: "completed", summaryStatus: "completed" }],
  syncSettings: { cloudBackupEnabled: false, weeklyDigestEnabled: true, weeklyDigestNotificationId: "weekly-id", dailyFocusReminderEnabled: true, dailyFocusReminderNotificationId: "daily-id" },
};

describe("تصدير بيانات الدراسة", () => {
  it("يحفظ النصوص والهيكل ويستبعد مسارات الوسائط والتنبيهات المحلية", () => {
    const result = createStudyDataExport(store, "2026-08-20T12:00:00.000Z");

    expect(result.format).toBe("muhadir-study-data");
    expect(result.mediaIncluded).toBe(false);
    expect(result.data.lectures[0].transcript).toBe("نص المحاضرة");
    expect(result.data.lectures[0].hasLocalMedia).toBe(true);
    expect(JSON.stringify(result)).not.toContain("file:///private");
    expect(JSON.stringify(result)).not.toContain("weekly-id");
    expect(JSON.stringify(result)).not.toContain("daily-id");
    expect(createStudyDataExportJson(store)).toContain("نص المحاضرة");
  });
});
