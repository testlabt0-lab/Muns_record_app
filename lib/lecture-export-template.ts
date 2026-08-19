import type { Lecture, Subject } from "@/lib/study-types";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export function buildLectureExportHtml(lecture: Lecture, subject?: Subject) {
  const summary = lecture.summary;
  const list = (items: string[]) => items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8" /><style>@page{margin:28px}body{font-family:Arial,sans-serif;color:#172554;line-height:1.7}h1{color:#4338CA;margin-bottom:4px}h2{font-size:18px;margin-top:28px;color:#4338CA}.meta{color:#64748B;font-size:12px}.card{background:#F8FAFF;border:1px solid #C7D2FE;border-radius:12px;padding:14px;margin:12px 0}li{margin-bottom:7px}</style></head><body><h1>${escapeHtml(lecture.title)}</h1><p class="meta">${escapeHtml(subject?.title ?? "مادة")} · ${lecture.section === "theory" ? "نظري" : "عملي"} · ${new Date(lecture.recordedAt).toLocaleDateString("ar")}</p>${summary ? `<section class="card"><h2>الملخص</h2><p>${escapeHtml(summary.overview)}</p><h2>أهم النقاط</h2><ul>${list(summary.keyPoints)}</ul><h2>مصطلحات مهمة</h2><ul>${list(summary.terms)}</ul><h2>أسئلة للمراجعة</h2><ul>${list(summary.reviewQuestions)}</ul></section>` : ""}${lecture.transcript ? `<section><h2>نص المحاضرة</h2><p>${escapeHtml(lecture.transcript).replace(/\n/g, "<br />")}</p></section>` : ""}</body></html>`;
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 بايت";
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
}
