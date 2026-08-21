import type { WeeklyReflection } from "./study-types";

export type FollowUpBatchAction = "complete" | "postpone";

export type FollowUpBatchUndoSnapshot = {
  action: FollowUpBatchAction;
  count: number;
  reflections: WeeklyReflection[];
};

function cloneReflection(reflection: WeeklyReflection): WeeklyReflection {
  return { ...reflection, focusAreas: reflection.focusAreas ? [...reflection.focusAreas] : undefined };
}

export function createFollowUpBatchUndoSnapshot(reflections: WeeklyReflection[], action: FollowUpBatchAction, count: number): FollowUpBatchUndoSnapshot {
  return { action, count, reflections: reflections.map(cloneReflection) };
}

export function restoreFollowUpBatchUndoSnapshot(snapshot: FollowUpBatchUndoSnapshot): WeeklyReflection[] {
  return snapshot.reflections.map(cloneReflection);
}
