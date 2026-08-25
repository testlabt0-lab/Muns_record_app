export type TaskDatePickerMode = "date" | "time" | "datetime";

export function mergeTaskDateTime(base: Date, selected: Date, mode: TaskDatePickerMode) {
  if (mode === "date") return new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), base.getHours(), base.getMinutes());
  if (mode === "time") return new Date(base.getFullYear(), base.getMonth(), base.getDate(), selected.getHours(), selected.getMinutes());
  return selected;
}
