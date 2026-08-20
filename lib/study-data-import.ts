import type { StudyStore } from "./study-types";

export const importSections = ["structure", "lectures", "review", "tasks"] as const;
export type StudyDataImportSection = (typeof importSections)[number];

export type StudyDataImportPayload = {
  years: StudyStore["years"]; terms: StudyStore["terms"]; subjects: StudyStore["subjects"]; lectures: StudyStore["lectures"]; reviewCards: StudyStore["reviewCards"]; tasks: StudyStore["tasks"];
  reviewLists: NonNullable<StudyStore["reviewLists"]>; reviewSessions: NonNullable<StudyStore["reviewSessions"]>; reviewChallenges: NonNullable<StudyStore["reviewChallenges"]>;
};

export interface StudyDataImportPreview { incoming: number; additions: number; duplicates: number; blocked: number; }
export type StudyDataImportPreviewBySection = Record<StudyDataImportSection, StudyDataImportPreview>;

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

function withoutLocalMedia<T extends StudyStore["lectures"][number]>(lecture: T): T { return { ...lecture, audioUri: undefined, audioParts: [], attachments: [] }; }
function hasLocalMedia(lecture: StudyStore["lectures"][number]) { return Boolean(lecture.audioUri || lecture.audioParts?.length || lecture.attachments?.length); }

/** يستبدل بيانات الدراسة المؤكدة مع أرشفة المحاضرات المحلية التي تحمل وسائط غير موجودة في الملف. */
export function replaceStudyDataFromImport(current: StudyStore, incoming: StudyDataImportPayload, archivedAt = new Date().toISOString()): StudyStore {
  const years = incoming.years;
  const yearIds = new Set(years.map((item) => item.id));
  const terms = incoming.terms.filter((item) => yearIds.has(item.yearId));
  const termIds = new Set(terms.map((item) => item.id));
  const subjects = incoming.subjects.filter((item) => termIds.has(item.termId));
  const subjectIds = new Set(subjects.map((item) => item.id));
  const incomingLectures = incoming.lectures.filter((item) => subjectIds.has(item.subjectId)).map(withoutLocalMedia);
  const localMediaByLectureId = new Map(current.lectures.filter(hasLocalMedia).map((lecture) => [lecture.id, lecture]));
  const incomingLectureIds = new Set(incomingLectures.map((item) => item.id));
  const lectures = [
    ...incomingLectures.map((lecture) => { const local = localMediaByLectureId.get(lecture.id); return local ? { ...lecture, audioUri: local.audioUri, audioSizeBytes: local.audioSizeBytes, audioParts: local.audioParts, attachments: local.attachments } : lecture; }),
    ...current.lectures.filter((lecture) => hasLocalMedia(lecture) && !incomingLectureIds.has(lecture.id)).map((lecture) => ({ ...lecture, archivedAt: lecture.archivedAt ?? archivedAt })),
  ];
  const lectureIds = new Set(lectures.map((item) => item.id));
  const reviewCards = incoming.reviewCards.filter((item) => lectureIds.has(item.lectureId));
  const reviewLists = incoming.reviewLists.filter((item) => item.lectureIds.some((id) => lectureIds.has(id))).map((item) => ({ ...item, lectureIds: item.lectureIds.filter((id) => lectureIds.has(id)), completedLectureIds: item.completedLectureIds.filter((id) => lectureIds.has(id)) }));
  const reviewSessions = incoming.reviewSessions.map((item) => item.subjectId && !subjectIds.has(item.subjectId) ? { ...item, subjectId: undefined } : item);
  const reviewChallenges = incoming.reviewChallenges.filter((item) => subjectIds.has(item.subjectId));
  const tasks = incoming.tasks.map((item) => ({ ...item, subjectId: item.subjectId && subjectIds.has(item.subjectId) ? item.subjectId : undefined, notificationId: undefined, calendarEventId: undefined }));
  return { ...current, years, terms, subjects, lectures, reviewCards, reviewLists, reviewSessions, reviewChallenges, tasks };
}

/** يعرض أثراً واضحاً للدمج؛ لا يغير المحتوى ولا يعدّل المعرّفات المتكررة. */
export function getStudyDataImportPreview(current: StudyStore, incoming: StudyDataImportPayload, selected: StudyDataImportSection[]): StudyDataImportPreviewBySection {
  const choose = (section: StudyDataImportSection) => selected.includes(section);
  const preview = (): StudyDataImportPreview => ({ incoming: 0, additions: 0, duplicates: 0, blocked: 0 });
  const structure = preview(); const lectures = preview(); const review = preview(); const tasks = preview();
  const count = <T extends { id: string }>(items: T[], existingIds: Set<string>, allowed: (item: T) => boolean, target: StudyDataImportPreview) => items.forEach((item) => { target.incoming += 1; if (existingIds.has(item.id)) target.duplicates += 1; else if (!allowed(item)) target.blocked += 1; else target.additions += 1; });
  const yearIds = new Set(current.years.map((item) => item.id));
  if (choose("structure")) count(incoming.years, yearIds, () => true, structure);
  const mergedYearIds = new Set([...yearIds, ...(choose("structure") ? incoming.years.map((item) => item.id) : [])]);
  const termIds = new Set(current.terms.map((item) => item.id));
  if (choose("structure")) count(incoming.terms, termIds, (item) => mergedYearIds.has(item.yearId), structure);
  const mergedTermIds = new Set([...termIds, ...(choose("structure") ? incoming.terms.filter((item) => mergedYearIds.has(item.yearId)).map((item) => item.id) : [])]);
  const subjectIds = new Set(current.subjects.map((item) => item.id));
  if (choose("structure")) count(incoming.subjects, subjectIds, (item) => mergedTermIds.has(item.termId), structure);
  const mergedSubjectIds = new Set([...subjectIds, ...(choose("structure") ? incoming.subjects.filter((item) => mergedTermIds.has(item.termId)).map((item) => item.id) : [])]);
  const lectureIds = new Set(current.lectures.map((item) => item.id));
  if (choose("lectures")) count(incoming.lectures, lectureIds, (item) => mergedSubjectIds.has(item.subjectId), lectures);
  const mergedLectureIds = new Set([...lectureIds, ...(choose("lectures") ? incoming.lectures.filter((item) => mergedSubjectIds.has(item.subjectId)).map((item) => item.id) : [])]);
  if (choose("review")) {
    count(incoming.reviewCards, new Set(current.reviewCards.map((item) => item.id)), (item) => mergedLectureIds.has(item.lectureId), review);
    count(incoming.reviewLists, new Set((current.reviewLists ?? []).map((item) => item.id)), (item) => item.lectureIds.some((id) => mergedLectureIds.has(id)), review);
    count(incoming.reviewSessions, new Set((current.reviewSessions ?? []).map((item) => item.id)), () => true, review);
    count(incoming.reviewChallenges, new Set((current.reviewChallenges ?? []).map((item) => item.id)), (item) => mergedSubjectIds.has(item.subjectId), review);
  }
  if (choose("tasks")) count(incoming.tasks, new Set(current.tasks.map((item) => item.id)), () => true, tasks);
  return { structure, lectures, review, tasks };
}
