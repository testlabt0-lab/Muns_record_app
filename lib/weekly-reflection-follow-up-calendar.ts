import type { OpenFollowUpItem } from "./weekly-reflection-follow-up-list";

function dateKey(date: Date) { return date.toISOString().slice(0, 10); }
export function getFollowUpCalendar(openItems: OpenFollowUpItem[], now = new Date(), days = 7) { return Array.from({ length: days }, (_, index) => { const date = new Date(now); date.setDate(date.getDate() + index); const key = dateKey(date); return { date: key, label: index === 0 ? "اليوم" : index === 1 ? "غداً" : date.toLocaleDateString("ar", { weekday: "short", day: "numeric" }), items: openItems.filter((item) => item.followUpDueAt === key) }; }); }
