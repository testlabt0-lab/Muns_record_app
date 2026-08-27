import type { FollowUpActivity, WeeklyReflection } from "./study-types";

export type FollowUpBatchAction = "complete" | "postpone";

export type FollowUpBatchUndoSnapshot = {
  action: FollowUpBatchAction;
  count: number;
  reflections: WeeklyReflection[];
  activities: FollowUpActivity[];
};

function cloneReflection(reflection: WeeklyReflection): WeeklyReflection {
  return { ...reflection, focusAreas: reflection.focusAreas ? [...reflection.focusAreas] : undefined };
}

export function createFollowUpBatchUndoSnapshot(reflections: WeeklyReflection[], action: FollowUpBatchAction, count: number, activities: FollowUpActivity[] = []): FollowUpBatchUndoSnapshot {
  return { action, count, reflections: reflections.map(cloneReflection), activities: activities.map((activity) => ({ ...activity })) };
}

export function restoreFollowUpBatchUndoSnapshot(snapshot: FollowUpBatchUndoSnapshot): WeeklyReflection[] {
  return snapshot.reflections.map(cloneReflection);
}
