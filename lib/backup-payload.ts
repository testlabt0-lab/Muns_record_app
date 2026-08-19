import type { StudyStore } from "@/lib/study-types";

export function createBackupPayload(store: StudyStore) {
  return JSON.stringify({
    ...store,
    lectures: store.lectures.map(({ audioUri: _audioUri, audioSizeBytes: _audioSizeBytes, attachments: _attachments, ...lecture }) => lecture),
    syncSettings: { cloudBackupEnabled: true },
  });
}

export function parseBackupPayload(payload: string): Partial<StudyStore> {
  const value = JSON.parse(payload) as Partial<StudyStore>;
  if (!Array.isArray(value.years) || !Array.isArray(value.terms) || !Array.isArray(value.subjects) || !Array.isArray(value.lectures)) {
    throw new Error("صيغة النسخة الاحتياطية غير صالحة.");
  }
  return value;
}
