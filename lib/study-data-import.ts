import type { StudyStore } from "./study-types";

export const importSections = ["structure", "lectures", "review", "tasks"] as const;
export type StudyDataImportSection = (typeof importSections)[number];

export type StudyDataImportPayload = {
  years: StudyStore["years"]; terms: StudyStore["terms"]; subjects: StudyStore["subjects"]; lectures: StudyStore["lectures"]; reviewCards: StudyStore["reviewCards"]; tasks: StudyStore["tasks"];
  reviewLists: NonNullable<StudyStore["reviewLists"]>; reviewSessions: NonNullable<StudyStore["reviewSessions"]>; reviewChallenges: NonNullable<StudyStore["reviewChallenges"]>;
};

function asArray<T>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : []; }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function uniqueById<T extends { id: string }>(current: T[], incoming: T[]) { const known = new Set(current.map((item) => item.id)); return [...current, ...incoming.filter((item) => item && typeof item.id === "string" && !known.has(item.id))]; }

/** يقرأ فقط المخطط الذي يصدره التطبيق، ولا يقبل أي صيغة عامة أو مجهولة. */
export function parseStudyDataImportJson(source: string): StudyDataImportPayload {
  let parsed: unknown;
  try { parsed = JSON.parse(source); } catch { throw new Error("ملف JSON غير صالح."); }
  if (!isRecord(parsed) || parsed.format !== "muhadir-study-data" || parsed.schemaVersion !== 1 || !isRecord(parsed.data)) throw new Error("هذا الملف ليس نسخة بيانات صالحة من مُحاضِر.");
  const data = parsed.data;
  return {
    years: asArray<StudyStore["years"][number]>(data.years), terms: asArray<StudyStore["terms"][number]>(data.terms), subjects: asArray<StudyStore["subjects"][number]>(data.subjects), lectures: asArray<StudyStore["lectures"][number]>(data.lectures),
    reviewCards: asArray<StudyStore["reviewCards"][number]>(data.reviewCards), reviewLists: asArray<NonNullable<StudyStore["reviewLists"]>[number]>(data.reviewLists), reviewSessions: asArray<NonNullable<StudyStore["reviewSessions"]>[number]>(data.reviewSessions), reviewChallenges: asArray<NonNullable<StudyStore["reviewChallenges"]>[number]>(data.reviewChallenges), tasks: asArray<StudyStore["tasks"][number]>(data.tasks),
  };
}

/** يدمج الفئات المختارة ولا يستبدل محتوى الجهاز أو إعداداته أو ملفات الوسائط المحلية. */
export function mergeStudyDataImport(current: StudyStore, incoming: StudyDataImportPayload, selected: StudyDataImportSection[]): StudyStore {
  const choose = (section: StudyDataImportSection) => selected.includes(section);
  const years = choose("structure") ? uniqueById(current.years, incoming.years) : current.years;
  const yearIds = new Set(years.map((year) => year.id));
  const terms = choose("structure") ? uniqueById(current.terms, incoming.terms.filter((term) => yearIds.has(term.yearId))) : current.terms;
  const termIds = new Set(terms.map((term) => term.id));
  const subjects = choose("structure") ? uniqueById(current.subjects, incoming.subjects.filter((subject) => termIds.has(subject.termId))) : current.subjects;
  const subjectIds = new Set(subjects.map((subject) => subject.id));
  const lectures = choose("lectures") ? uniqueById(current.lectures, incoming.lectures.filter((lecture) => subjectIds.has(lecture.subjectId)).map((lecture) => ({ ...lecture, audioUri: undefined, audioParts: [], attachments: [] }))) : current.lectures;
  const lectureIds = new Set(lectures.map((lecture) => lecture.id));
  const reviewCards = choose("review") ? uniqueById(current.reviewCards, incoming.reviewCards.filter((card) => lectureIds.has(card.lectureId))) : current.reviewCards;
  const reviewLists = choose("review") ? uniqueById(current.reviewLists ?? [], incoming.reviewLists.filter((list) => list.lectureIds.some((id) => lectureIds.has(id))).map((list) => ({ ...list, lectureIds: list.lectureIds.filter((id) => lectureIds.has(id)), completedLectureIds: list.completedLectureIds.filter((id) => lectureIds.has(id)) }))) : (current.reviewLists ?? []);
  const reviewSessions = choose("review") ? uniqueById(current.reviewSessions ?? [], incoming.reviewSessions.map((session) => session.subjectId && !subjectIds.has(session.subjectId) ? { ...session, subjectId: undefined } : session)) : (current.reviewSessions ?? []);
  const reviewChallenges = choose("review") ? uniqueById(current.reviewChallenges ?? [], incoming.reviewChallenges.filter((challenge) => subjectIds.has(challenge.subjectId))) : (current.reviewChallenges ?? []);
  const tasks = choose("tasks") ? uniqueById(current.tasks, incoming.tasks.map((task) => task.subjectId && !subjectIds.has(task.subjectId) ? { ...task, subjectId: undefined, notificationId: undefined, calendarEventId: undefined } : { ...task, notificationId: undefined, calendarEventId: undefined })) : current.tasks;
  return { ...current, years, terms, subjects, lectures, reviewCards, reviewLists, reviewSessions, reviewChallenges, tasks };
}
