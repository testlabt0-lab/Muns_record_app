import type { ManagedFollowUpItem } from "./weekly-reflection-follow-up-manager";

export type FollowUpManagerReportFilters = {
  query?: string;
  status: string;
  subject: string;
  priority: string;
  due: string;
  sort: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function priorityLabel(priority?: ManagedFollowUpItem["followUpPriority"]) {
  return priority === "high" ? "عالية" : priority === "low" ? "منخفضة" : "متوسطة";
}

function statusLabel(item: ManagedFollowUpItem) {
  if (item.status === "completed") return "مكتملة";
  return item.isOverdue ? "متأخرة" : "مفتوحة";
}

function formatDate(value?: string) {
  if (!value) return "بلا موعد";
  return new Date(`${value.includes("T") ? value : `${value}T00:00:00`}`).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" });
}

export function createFollowUpManagerReportHtml(items: ManagedFollowUpItem[], filters: FollowUpManagerReportFilters, getSubjectName: (subjectId?: string) => string | undefined, generatedAt = new Date()) {
  const openCount = items.filter((item) => item.status === "open").length;
  const completedCount = items.filter((item) => item.status === "completed").length;
  const overdueCount = items.filter((item) => item.isOverdue).length;
  const activeFilters = [`الحالة: ${filters.status}`, `المادة: ${filters.subject}`, `الأولوية: ${filters.priority}`, `الاستحقاق: ${filters.due}`, `الترتيب: ${filters.sort}`, filters.query?.trim() ? `البحث: ${filters.query.trim()}` : ""].filter(Boolean).join(" · ");
  const rows = items.length ? items.map((item) => {
    const meta = [statusLabel(item), `أولوية ${priorityLabel(item.followUpPriority)}`, getSubjectName(item.followUpSubjectId) ?? "دون مادة", item.status === "completed" ? `أُنجزت ${formatDate(item.followUpCompletedAt)}` : `الاستحقاق: ${formatDate(item.followUpDueAt)}`].join(" · ");
    return `<article><h2>${escapeHtml(item.followUpGoal ?? "")}</h2><p class="meta">${escapeHtml(meta)}</p>${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}</article>`;
  }).join("") : "<p class=\"empty\">لا توجد خطوات مطابقة للفلاتر الحالية.</p>";
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><style>@page{margin:26px}body{color:#172554;direction:rtl;font-family:Arial,sans-serif}h1{color:#047857;margin:0 0 6px}.muted,.footer{color:#64748B;font-size:11px;line-height:1.7}.metrics{display:flex;gap:8px;margin:14px 0}.metric{background:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;flex:1;padding:9px}.metric b{color:#047857;font-size:18px}.metric span{color:#475569;display:block;font-size:10px;margin-top:3px}.filters{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;color:#475569;font-size:10px;line-height:1.8;margin:10px 0;padding:9px}article{background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;margin:12px 0;padding:12px}h2{color:#047857;font-size:14px;margin:0 0 7px}p{color:#334155;font-size:13px;line-height:1.7;margin:0}.meta{color:#047857;font-size:11px;font-weight:bold;margin-bottom:7px}.empty{color:#64748B}.footer{margin-top:22px}</style></head><body><h1>حالة خطوات المتابعة</h1><p class="muted">${items.length} خطوة مطابقة · أُنشئ محلياً في ${escapeHtml(generatedAt.toLocaleString("ar"))}</p><section class="metrics"><div class="metric"><b>${openCount}</b><span>مفتوحة</span></div><div class="metric"><b>${completedCount}</b><span>مكتملة</span></div><div class="metric"><b>${overdueCount}</b><span>متأخرة</span></div></section><section class="filters"><strong>الفلاتر الحالية</strong><br/>${escapeHtml(activeFilters)}</section>${rows}<p class="footer">يبقى هذا التقرير محلياً حتى تختار مشاركته من جهازك.</p></body></html>`;
}
