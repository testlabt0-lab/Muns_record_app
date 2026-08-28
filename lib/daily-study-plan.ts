import type { Lecture, ReviewCard } from "@/lib/study-types";
import type { OpenFollowUpItem } from "@/lib/weekly-reflection-follow-up-list";

export type DailyStudyPlanAction = "review" | "follow-up" | "transcribe" | "summarize";

export interface DailyStudyPlanItem {
  id: string;
  action: DailyStudyPlanAction;
  title: string;
  description: string;
  count?: number;
  subjectId?: string;
  lectureId?: string;
}

function endOfDay(date: Date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

export function getDailyStudyPlan({ reviewCards, followUps, lectures, now = new Date() }: { reviewCards: ReviewCard[]; followUps: OpenFollowUpItem[]; lectures: Lecture[]; now?: Date }): DailyStudyPlanItem[] {
  const items: DailyStudyPlanItem[] = [];
  const dueCards = reviewCards.filter((card) => new Date(card.dueAt).getTime() <= endOfDay(now)).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  if (dueCards.length) {
    const lecture = lectures.find((item) => item.id === dueCards[0].lectureId);
    items.push({ id: "due-review", action: "review", title: `راجع ${dueCards.length} بطاقة مستحقة`, description: "ابدأ جلسة قصيرة بالبطاقات التي حان موعدها.", count: dueCards.length, subjectId: lecture?.subjectId });
  }
  const overdueOrToday = followUps.filter((item) => item.isOverdue || item.followUpDueAt === now.toISOString().slice(0, 10));
  if (overdueOrToday.length) items.push({ id: "follow-ups", action: "follow-up", title: `أكمل ${overdueOrToday.length} خطوة متابعة`, description: overdueOrToday.some((item) => item.isOverdue) ? "تتضمن خطوات متأخرة تحتاج قراراً سريعاً." : "لديك خطوات مستحقة اليوم.", count: overdueOrToday.length, subjectId: overdueOrToday[0].followUpSubjectId });
  const readyForTranscript = lectures.filter((lecture) => Boolean(lecture.audioUri || lecture.audioParts?.length) && !lecture.transcript && lecture.transcriptionStatus !== "processing");
  if (readyForTranscript.length) items.push({ id: `transcribe-${readyForTranscript[0].id}`, action: "transcribe", title: "حوّل محاضرة إلى نص", description: `«${readyForTranscript[0].title}» جاهزة للمعالجة عند اختيارك.`, lectureId: readyForTranscript[0].id, subjectId: readyForTranscript[0].subjectId });
  const readyForSummary = lectures.filter((lecture) => lecture.transcript && !lecture.summary && lecture.summaryStatus !== "processing");
  if (readyForSummary.length) items.push({ id: `summarize-${readyForSummary[0].id}`, action: "summarize", title: "أنشئ ملخصاً للمحاضرة", description: `لديك نص جاهز من «${readyForSummary[0].title}».`, lectureId: readyForSummary[0].id, subjectId: readyForSummary[0].subjectId });
  return items.slice(0, 3);
}
