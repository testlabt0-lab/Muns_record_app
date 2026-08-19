import { describe, expect, it } from "vitest";

import { createBackupPayload, parseBackupPayload } from "../lib/backup-payload";
import type { StudyStore } from "../lib/study-types";

const store: StudyStore = {
  years: [], terms: [], subjects: [], reviewCards: [], tasks: [], syncSettings: { cloudBackupEnabled: false },
  lectures: [{ id: "l1", subjectId: "s1", section: "theory", title: "محاضرة", recordedAt: "2026-08-19", durationSeconds: 1, audioUri: "file:///private.m4a", audioSizeBytes: 500, attachments: [{ id: "a1", lectureId: "l1", kind: "image", title: "سبورة", uri: "file:///private.jpg", mimeType: "image/jpeg", createdAt: "2026-08-19" }], transcriptionStatus: "completed", summaryStatus: "completed" }],
};

describe("النسخ الاحتياطي المحلي أولاً", () => {
  it("يحفظ بيانات الدراسة ولا يرفع مسارات الصوت أو المرفقات المحلية", () => {
    const payload = createBackupPayload(store);
    expect(payload).not.toContain("private.m4a");
    expect(payload).not.toContain("private.jpg");
    const restored = parseBackupPayload(payload);
    expect(restored.lectures?.[0]).toMatchObject({ id: "l1", title: "محاضرة" });
    expect(restored.lectures?.[0].audioUri).toBeUndefined();
  });
});
