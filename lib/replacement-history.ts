import type { ReplacementSnapshot, StudyStore } from "./study-types";

/** يلتقط بيانات الدراسة قبل الاستبدال مع حذف السجل نفسه لمنع النسخ المتداخلة. */
export function createReplacementSnapshot(id: string, label: string, store: StudyStore, createdAt: string): ReplacementSnapshot {
  const { replacementSnapshots: _replacementSnapshots, ...data } = store;
  return { id, label, createdAt, data };
}

/** يعيد البيانات من لقطة محلية ويحتفظ بلقطة أمان للحالة الحالية كي يمكن الرجوع عنها أيضاً. */
export function restoreReplacementSnapshot(current: StudyStore, snapshot: ReplacementSnapshot, safetySnapshot: ReplacementSnapshot): StudyStore {
  return { ...snapshot.data, replacementSnapshots: [safetySnapshot, ...(current.replacementSnapshots ?? [])].slice(0, 3) };
}
