import type { WeeklyReflection } from "./study-types";
import { getOpenFollowUpItems, type OpenFollowUpItem } from "./weekly-reflection-follow-up-list";

export function getTodayFollowUpItems(reflections: WeeklyReflection[], now = new Date()): OpenFollowUpItem[] {
  const today = now.toISOString().slice(0, 10);
  return getOpenFollowUpItems(reflections, now).filter((item) => Boolean(item.followUpDueAt && item.followUpDueAt <= today));
}

export function getTodayFollowUpSummary(items: OpenFollowUpItem[]) {
  const overdueCount = items.filter((item) => item.isOverdue).length;
  return { total: items.length, overdueCount, dueTodayCount: items.length - overdueCount };
}
