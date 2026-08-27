import type { WeeklyReflection } from "./study-types";
import { getOpenFollowUpItems, type OpenFollowUpItem } from "./weekly-reflection-follow-up-list";

export function getTomorrowFollowUpItems(reflections: WeeklyReflection[], now = new Date()): OpenFollowUpItem[] {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = tomorrow.toISOString().slice(0, 10);
  return getOpenFollowUpItems(reflections, now).filter((item) => item.followUpDueAt === tomorrowKey);
}
