import type { StudyStore } from "./study-types";

/**
 * ينشئ حزمة JSON قابلة للمشاركة من البيانات المحلية المنظمة.
 * لا تُضمّن الملفات الصوتية أو المرفقات الثنائية؛ بل تحفظ بياناتها الوصفية فقط.
 */
export function createStudyDataExport(store: StudyStore, exportedAt = new Date().toISOString()) {
  const { weeklyDigestNotificationId, dailyFocusReminderNotificationId, weeklyReflectionReminderNotificationId, ...settings } = store.syncSettings;
  return {
    format: "muhadir-study-data",
    schemaVersion: 1,
    exportedAt,
    mediaIncluded: false,
    note: "يحتوي هذا الملف على بيانات الدراسة والنصوص والملخصات والمراجعة، ولا يحتوي ملفات الصوت أو المرفقات نفسها.",
    data: {
      ...store,
      syncSettings: { ...settings, weeklyDigestEnabled: false, dailyFocusReminderEnabled: false, weeklyReflectionReminderEnabled: false },
      lectures: store.lectures.map(({ audioUri, audioParts, attachments, ...lecture }) => ({
        ...lecture,
        hasLocalMedia: Boolean(audioUri || audioParts?.length || attachments?.length),
        audioParts: (audioParts ?? []).map(({ uri, ...part }) => part),
        attachments: (attachments ?? []).map(({ uri, ...attachment }) => attachment),
      })),
    },
  };
}

export function createStudyDataExportJson(store: StudyStore, exportedAt?: string) {
  return JSON.stringify(createStudyDataExport(store, exportedAt), null, 2);
}
