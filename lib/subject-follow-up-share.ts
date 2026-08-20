import type { SubjectFollowUp } from "./subject-follow-up";

/** يصوغ نصاً قصيراً قابلاً للمشاركة من قراءة المتابعة المحلية، دون أسماء ملفات أو محتوى محاضرات. */
export function createSubjectFollowUpShareText({ items, filterLabel }: { items: SubjectFollowUp[]; filterLabel: string }) {
  const attention = items.filter((item) => item.status !== "on-track");
  const previews = attention.slice(0, 3).map((item) => `• ${item.subject.title}: ${item.goal ? `${item.percent}% من الهدف` : "حدّد هدفاً"}`).join("\n");
  return [`ملخص متابعة المواد — ${filterLabel}`, `المواد التي تحتاج متابعة: ${attention.length} من ${items.length}`, previews || "• جميع المواد ذات الأهداف المحفوظة تسير ضمن المسار.", "أُنشئ هذا الملخص محلياً بواسطة مُحاضِر."].join("\n");
}
