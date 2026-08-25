import { describe, expect, it } from "vitest";
import { mergeTaskDateTime } from "../lib/task-date-time";

describe("اختيار تاريخ ووقت المهام", () => {
  it("يحافظ على الوقت عند استبدال التاريخ", () => {
    const base = new Date(2026, 7, 25, 14, 30);
    const selected = new Date(2026, 8, 3, 9, 0);
    const result = mergeTaskDateTime(base, selected, "date");
    expect([result.getFullYear(), result.getMonth(), result.getDate(), result.getHours(), result.getMinutes()]).toEqual([2026, 8, 3, 14, 30]);
  });

  it("يحافظ على التاريخ عند استبدال الوقت", () => {
    const base = new Date(2026, 7, 25, 14, 30);
    const selected = new Date(2026, 0, 1, 8, 5);
    const result = mergeTaskDateTime(base, selected, "time");
    expect([result.getFullYear(), result.getMonth(), result.getDate(), result.getHours(), result.getMinutes()]).toEqual([2026, 7, 25, 8, 5]);
  });

  it("يعتمد التاريخ الكامل عند اختيار التاريخ والوقت معًا", () => {
    const selected = new Date(2026, 9, 12, 17, 45);
    expect(mergeTaskDateTime(new Date(2026, 1, 1), selected, "datetime")).toBe(selected);
  });
});
