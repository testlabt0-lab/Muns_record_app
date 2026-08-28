export type SummaryStyle = "quick" | "exam" | "outline";

export const SUMMARY_STYLES: { value: SummaryStyle; label: string; instruction: string }[] = [
  { value: "quick", label: "فهم سريع", instruction: "ركّز على الفكرة العامة والنقاط الأساسية بعبارات موجزة تساعد الطالب على الفهم السريع." },
  { value: "exam", label: "مذاكرة للاختبار", instruction: "ركّز على التعريفات والفروق والأسئلة المحتملة التي تساعد الطالب على مراجعة اختبار قريب." },
  { value: "outline", label: "خطة محاضرة", instruction: "نظّم المحتوى كسير منطقي للمحاضرة مع المفاهيم والأمثلة والعلاقات الأساسية." },
];

export function getSummaryStyleInstruction(style: SummaryStyle) {
  return SUMMARY_STYLES.find((item) => item.value === style)?.instruction ?? SUMMARY_STYLES[0].instruction;
}

export function getSummaryStyleLabel(style: SummaryStyle | undefined) {
  return SUMMARY_STYLES.find((item) => item.value === style)?.label ?? SUMMARY_STYLES[0].label;
}
