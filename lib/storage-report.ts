import type { Lecture, Subject } from "@/lib/study-types";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 بايت";
  const units = ["بايت", "ك.ب", "م.ب", "ج.ب"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index ? 1 : 0)} ${units[index]}`;
}

function lectureSize(lecture: Lecture) {
  return (lecture.audioSizeBytes ?? 0) + (lecture.attachments ?? []).reduce((sum, attachment) => sum + (attachment.sizeBytes ?? 0), 0);
}

export function createStorageReportHtml({ lectures, subjects, generatedAt = new Date() }: { lectures: Lecture[]; subjects: Subject[]; generatedAt?: Date }) {
  const total = lectures.reduce((sum, lecture) => sum + lectureSize(lecture), 0);
  const rows = new Map<string, { title: string; bytes: number; lectures: number }>();
  lectures.forEach((lecture) => {
    const current = rows.get(lecture.subjectId);
    const title = subjects.find((subject) => subject.id === lecture.subjectId)?.title ?? "مادة غير محددة";
    rows.set(lecture.subjectId, { title, bytes: (current?.bytes ?? 0) + lectureSize(lecture), lectures: (current?.lectures ?? 0) + 1 });
  });
  const subjectRows = Array.from(rows.values()).sort((a, b) => b.bytes - a.bytes);
  const tableRows = subjectRows.length ? subjectRows.map((row) => `<tr><td>${escapeHtml(row.title)}</td><td>${row.lectures}</td><td>${formatBytes(row.bytes)}</td><td>${total ? ((row.bytes / total) * 100).toFixed(0) : 0}%</td></tr>`).join("") : "<tr><td colspan=\"4\">لا توجد ملفات محلية مسجلة بعد.</td></tr>";
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><style>@page{margin:24px}body{font-family:Arial,sans-serif;color:#172554;direction:rtl}h1{color:#312E81;margin:0 0 8px}.muted{color:#64748B;font-size:12px}.summary{background:#EEF2FF;border-radius:12px;padding:14px;margin:18px 0}.summary strong{font-size:22px}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#312E81;color:white}th,td{border:1px solid #CBD5E1;padding:9px;text-align:right}tr:nth-child(even){background:#F8FAFC}.footer{margin-top:20px;color:#64748B;font-size:11px}</style></head><body><h1>تقرير مساحة التخزين — مُحاضِر</h1><p class="muted">أُنشئ محلياً في ${escapeHtml(generatedAt.toLocaleString("ar"))}</p><section class="summary"><div>إجمالي الحجم المحلي المعروف</div><strong>${formatBytes(total)}</strong><div class="muted">${lectures.length} محاضرة مسجلة ضمن التطبيق</div></section><h2>التوزيع حسب المادة</h2><table><thead><tr><th>المادة</th><th>المحاضرات</th><th>الحجم</th><th>النسبة</th></tr></thead><tbody>${tableRows}</tbody></table><p class="footer">يعرض التقرير أحجام التسجيلات والمرفقات المعروفة في مُحاضِر فقط، ولا يشمل جميع ملفات الجهاز.</p></body></html>`;
}
