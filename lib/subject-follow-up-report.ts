import type { SubjectFollowUp } from "./subject-follow-up";

function escapeHtml(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
const labels = { critical: "يحتاج أولوية", attention: "يحتاج متابعة", "on-track": "ضمن المسار", unplanned: "بلا هدف" } as const;

/** ينشئ تقرير متابعة عربي محلي من مؤشرات المواد فقط، من دون تضمين ملفات الصوت أو المرفقات. */
export function createSubjectFollowUpReportHtml({ items, filterLabel, createdAt = new Date() }: { items: SubjectFollowUp[]; filterLabel: string; createdAt?: Date }) {
  const needsAttention = items.filter((item) => item.status !== "on-track").length;
  const rows = items.map((item) => `<tr><td>${escapeHtml(item.subject.title)}</td><td>${labels[item.status]}</td><td>${item.goal ? `${item.percent}%` : "—"}</td><td>${escapeHtml(item.reason)}</td></tr>`).join("") || "<tr><td colspan=\"4\">لا توجد مواد مطابقة لهذا الترم.</td></tr>";
  return `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#172554;padding:28px;direction:rtl}h1{color:#4338CA;margin:0 0 6px}.meta{color:#64748B;font-size:12px;margin-bottom:20px}.summary{background:#F5F3FF;border:1px solid #DDD6FE;border-radius:12px;padding:14px;margin-bottom:18px}.value{font-size:24px;font-weight:700;color:#4338CA}table{border-collapse:collapse;width:100%}th,td{border:1px solid #E2E8F0;padding:10px;text-align:right;font-size:12px}th{background:#EEF2FF;color:#3730A3}.privacy{margin-top:24px;border-top:1px solid #E2E8F0;padding-top:12px;color:#64748B;font-size:11px}</style></head><body><h1>تقرير متابعة المواد</h1><div class="meta">${escapeHtml(filterLabel)} · ${createdAt.toLocaleDateString("ar")}</div><div class="summary"><div class="value">${needsAttention}</div><div>مادة تحتاج متابعة من أصل ${items.length}</div></div><table><thead><tr><th>المادة</th><th>الحالة</th><th>تقدم الهدف</th><th>سبب المتابعة</th></tr></thead><tbody>${rows}</tbody></table><p class="privacy">أُنشئ هذا التقرير محلياً من تقدمك وأهدافك. لا يتضمن تسجيلات الصوت أو المرفقات.</p></body></html>`;
}
