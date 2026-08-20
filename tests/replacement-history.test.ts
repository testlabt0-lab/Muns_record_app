import { describe, expect, it } from "vitest";

import { createReplacementSnapshot, restoreReplacementSnapshot } from "../lib/replacement-history";
import type { StudyStore } from "../lib/study-types";

const store: StudyStore = { years: [], terms: [], subjects: [], lectures: [], reviewCards: [], tasks: [], syncSettings: { cloudBackupEnabled: false }, replacementSnapshots: [] };

describe("سجل استبدال البيانات", () => {
  it("يلتقط الحالة بلا سجل متداخل ويحتفظ بلقطة أمان عند الاستعادة", () => {
    const snapshot = createReplacementSnapshot("old", "قبل الاستبدال", { ...store, years: [{ id: "y", title: "سنة", isActive: true, archived: false, createdAt: "2026" }] }, "2026-01-01");
    const safety = createReplacementSnapshot("current", "قبل الاستعادة", store, "2026-02-01");
    const restored = restoreReplacementSnapshot(store, snapshot, safety);
    expect("replacementSnapshots" in snapshot.data).toBe(false);
    expect(restored.years).toHaveLength(1);
    expect(restored.replacementSnapshots?.[0].id).toBe("current");
  });
});
