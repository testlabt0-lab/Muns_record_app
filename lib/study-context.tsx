import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { createActiveAcademicYear, deactivateAcademicYears, findOrCreateTerm, normalizeRequiredTitle } from "@/lib/study-domain";
import { scheduleReview, type ReviewGrade } from "@/lib/review-scheduler";
import type { AcademicTerm, AcademicYear, BackupActivity, Lecture, LectureAttachment, LectureSummary, ReviewCard, ReviewList, ReviewSession, StudyStore, StudyTask, Subject, SubjectSection, TermKind } from "@/lib/study-types";
import { normalizeSubjectTermGoalTargets } from "@/lib/subject-term-goals";
import { getWeekStartIso, normalizeWeeklyGoalTargets } from "@/lib/subject-weekly-goals";
import { normalizeWeeklyReflection } from "@/lib/weekly-reflection";
import { createReplacementSnapshot, restoreReplacementSnapshot as restoreSnapshot } from "@/lib/replacement-history";

const STORE_KEY = "muhadir.study-store.v1";

const emptyStore: StudyStore = {
  years: [], terms: [], subjects: [], subjectGoals: [], weeklySubjectGoals: [], weeklyReflections: [], lectures: [], reviewCards: [], reviewLists: [], reviewSessions: [], reviewChallenges: [], tasks: [], backupActivities: [], replacementSnapshots: [],
  syncSettings: { cloudBackupEnabled: false, recordingPartMinutes: 20, preferredPlaybackRate: 1, storageWarningPercent: 80, weeklyDigestEnabled: false, weeklyReflectionReminderEnabled: false, weeklyReflectionReminderHour: 20, weeklyReflectionReminderMinute: 0, weeklyReflectionFollowUpReminderEnabled: false, weeklyReflectionFollowUpDueReminderEnabled: false, weeklyLectureGoal: 3, weeklyReviewGoal: 10, weeklyGoalNotificationEnabled: false, dailyFocusGoalMinutes: 30, dailyFocusReminderEnabled: false, weeklyReviewDays: [0, 2, 4], weeklyReviewReminderEnabled: false, weeklyReviewReminderHour: 18, weeklyReviewReminderMinute: 0, appearanceMode: "light", lastBackupStatus: "idle" },
};

type AddSubjectInput = { title: string; color: string; hasPracticalSection: boolean; theoryInstructor: string; practicalInstructor?: string };
type CreateLectureInput = Omit<Lecture, "id" | "recordedAt" | "transcriptionStatus" | "summaryStatus"> & { transcriptionStatus?: Lecture["transcriptionStatus"]; summaryStatus?: Lecture["summaryStatus"] };

type StudyContextValue = StudyStore & {
  hydrated: boolean;
  addYear: (title: string) => string;
  addTerm: (yearId: string, kind: TermKind) => string;
  addSubject: (termId: string, input: AddSubjectInput) => string;
  addLecture: (input: CreateLectureInput) => string;
  updateLecture: (lectureId: string, changes: Partial<Omit<Lecture, "id" | "subjectId" | "section" | "recordedAt">>) => void;
  deleteLecture: (lectureId: string) => void;
  restoreDeletedLecture: (lecture: Lecture, reviewCards: ReviewCard[]) => void;
  archiveLecture: (lectureId: string) => void;
  restoreArchivedLecture: (lectureId: string) => void;
  addAttachment: (lectureId: string, attachment: Omit<LectureAttachment, "id" | "lectureId" | "createdAt">) => string;
  removeAttachment: (lectureId: string, attachmentId: string) => void;
  updateAttachment: (lectureId: string, attachmentId: string, changes: Partial<Omit<LectureAttachment, "id" | "lectureId" | "createdAt">>) => void;
  addReviewCards: (lectureId: string, cards: Array<Pick<ReviewCard, "question" | "answer">>) => void;
  createReviewList: (title: string, lectureIds: string[]) => string;
  toggleReviewListLecture: (listId: string, lectureId: string) => void;
  deleteReviewList: (listId: string) => void;
  addReviewSession: (durationMinutes: number, subjectId?: string) => void;
  createReviewChallenge: (subjectId: string, targetCards: number) => string;
  deleteReviewChallenge: (challengeId: string) => void;
  setSubjectTermGoal: (subjectId: string, targets: { lectureTarget: number; reviewTarget: number; focusMinutesTarget: number }) => void;
  setSubjectWeeklyGoal: (subjectId: string, targets: { reviewTarget: number; focusMinutesTarget: number; lateReminderThresholdPercent?: number }) => void;
  markSubjectWeeklyGoalLateReminder: (subjectId: string, weekStart: string) => void;
  replaceSubjectGoalSettings: (subjectGoals: StudyStore["subjectGoals"], weeklySubjectGoals: StudyStore["weeklySubjectGoals"]) => void;
  saveWeeklyReflection: (weekStart: string, note: string, attributes?: { rating?: 1 | 2 | 3 | 4 | 5; focusAreas?: import("@/lib/study-types").ReflectionFocusArea[]; followUpGoal?: string; followUpCompleted?: boolean; followUpCompletedAt?: string; followUpPriority?: import("@/lib/study-types").FollowUpPriority; followUpDueAt?: string; followUpSubjectId?: string }) => void;
  markSubjectGoalNearReminder: (subjectId: string) => void;
  reviewCard: (cardId: string, correct: boolean) => void;
  gradeReviewCard: (cardId: string, grade: ReviewGrade) => void;
  addTask: (task: Omit<StudyTask, "id" | "createdAt" | "completed">) => string;
  updateTask: (taskId: string, changes: Partial<Pick<StudyTask, "title" | "dueAt" | "completed" | "notificationId" | "calendarEventId">>) => void;
  updateSyncSettings: (changes: Partial<StudyStore["syncSettings"]>) => void;
  addBackupActivity: (activity: Omit<BackupActivity, "id" | "createdAt">) => void;
  replaceStoreFromBackup: (backup: Partial<StudyStore>) => void;
  replaceStoreFromLocalImport: (store: StudyStore, snapshotLabel?: string) => void;
  restoreReplacementSnapshot: (snapshotId: string) => void;
  deleteReplacementSnapshot: (snapshotId: string) => void;
  getYear: (id: string) => AcademicYear | undefined;
  getTerm: (id: string) => AcademicTerm | undefined;
  getSubject: (id: string) => Subject | undefined;
  getTermForYear: (yearId: string, kind: TermKind) => AcademicTerm | undefined;
  getLecturesForSubject: (subjectId: string, section?: SubjectSection) => Lecture[];
};

const StudyContext = createContext<StudyContextValue | null>(null);

function makeId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }

function normalizeStore(value: Partial<StudyStore>): StudyStore {
  return {
    years: value.years ?? [], terms: value.terms ?? [], subjects: value.subjects ?? [], subjectGoals: value.subjectGoals ?? [], weeklySubjectGoals: value.weeklySubjectGoals ?? [], weeklyReflections: value.weeklyReflections ?? [],
    lectures: value.lectures?.map((lecture) => ({ ...lecture, tags: lecture.tags ?? [], tagColors: lecture.tagColors ?? {}, bookmarks: lecture.bookmarks ?? [], attachments: lecture.attachments ?? [], transcriptSegments: lecture.transcriptSegments ?? [], audioParts: lecture.audioParts ?? (lecture.audioUri ? [{ id: `${lecture.id}-legacy`, index: 1, uri: lecture.audioUri, durationSeconds: lecture.durationSeconds, sizeBytes: lecture.audioSizeBytes, createdAt: lecture.recordedAt }] : []) })) ?? [],
    reviewCards: value.reviewCards ?? [], reviewLists: value.reviewLists ?? [], reviewSessions: value.reviewSessions ?? [], reviewChallenges: value.reviewChallenges ?? [], tasks: value.tasks ?? [], backupActivities: value.backupActivities ?? [], replacementSnapshots: value.replacementSnapshots ?? [],
    syncSettings: { cloudBackupEnabled: false, recordingPartMinutes: 20, preferredPlaybackRate: 1, storageWarningPercent: 80, weeklyDigestEnabled: false, weeklyLectureGoal: 3, weeklyReviewGoal: 10, weeklyGoalNotificationEnabled: false, dailyFocusGoalMinutes: 30, dailyFocusReminderEnabled: false, weeklyReviewDays: [0, 2, 4], weeklyReviewReminderEnabled: false, weeklyReviewReminderHour: 18, weeklyReviewReminderMinute: 0, appearanceMode: "light", lastBackupStatus: "idle", ...value.syncSettings },
  };
}

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<StudyStore>(emptyStore);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { void (async () => {
    try {
      const saved = await AsyncStorage.getItem(STORE_KEY);
      if (saved) setStore(normalizeStore(JSON.parse(saved) as Partial<StudyStore>));
    } catch { setStore(emptyStore); } finally { setHydrated(true); }
  })(); }, []);

  useEffect(() => { if (hydrated) void AsyncStorage.setItem(STORE_KEY, JSON.stringify(store)); }, [store, hydrated]);

  const value = useMemo<StudyContextValue>(() => {
    const getYear = (id: string) => store.years.find((year) => year.id === id);
    const getTerm = (id: string) => store.terms.find((term) => term.id === id);
    const getSubject = (id: string) => store.subjects.find((subject) => subject.id === id);

    return {
      ...store,
      hydrated,
      addYear: (title) => {
        const id = makeId("year"); const year = createActiveAcademicYear(id, title, new Date().toISOString());
        setStore((current) => ({ ...current, years: [...deactivateAcademicYears(current.years), year] })); return id;
      },
      addTerm: (yearId, kind) => {
        const result = findOrCreateTerm(store.terms, yearId, kind, makeId("term"), new Date().toISOString());
        if (!result.isNew) return result.term.id;
        setStore((current) => ({ ...current, terms: [...current.terms, result.term] })); return result.term.id;
      },
      addSubject: (termId, input) => {
        const id = makeId("subject"); const title = normalizeRequiredTitle(input.title, "اسم المادة");
        setStore((current) => ({ ...current, subjects: [...current.subjects, { id, termId, title, color: input.color, hasPracticalSection: input.hasPracticalSection, theoryInstructor: input.theoryInstructor.trim() || "غير محدد", practicalInstructor: input.hasPracticalSection ? input.practicalInstructor?.trim() || "غير محدد" : undefined, createdAt: new Date().toISOString() }] })); return id;
      },
      addLecture: (input) => {
        const id = makeId("lecture");
        setStore((current) => ({ ...current, lectures: [{ ...input, id, recordedAt: new Date().toISOString(), tags: input.tags ?? [], tagColors: input.tagColors ?? {}, transcriptionStatus: input.transcriptionStatus ?? "local", summaryStatus: input.summaryStatus ?? "local", attachments: input.attachments ?? [], transcriptSegments: input.transcriptSegments ?? [] }, ...current.lectures] })); return id;
      },
      updateLecture: (lectureId, changes) => setStore((current) => ({ ...current, lectures: current.lectures.map((lecture) => lecture.id === lectureId ? { ...lecture, ...changes } : lecture) })),
      deleteLecture: (lectureId) => setStore((current) => ({ ...current, lectures: current.lectures.filter((lecture) => lecture.id !== lectureId), reviewCards: current.reviewCards.filter((card) => card.lectureId !== lectureId) })),
      restoreDeletedLecture: (lecture, cards) => setStore((current) => ({ ...current, lectures: [lecture, ...current.lectures.filter((item) => item.id !== lecture.id)], reviewCards: [...current.reviewCards.filter((card) => card.lectureId !== lecture.id), ...cards] })),
      archiveLecture: (lectureId) => setStore((current) => ({ ...current, lectures: current.lectures.map((lecture) => lecture.id === lectureId ? { ...lecture, archivedAt: new Date().toISOString() } : lecture) })),
      restoreArchivedLecture: (lectureId) => setStore((current) => ({ ...current, lectures: current.lectures.map((lecture) => lecture.id === lectureId ? { ...lecture, archivedAt: undefined } : lecture) })),
      addAttachment: (lectureId, attachment) => {
        const id = makeId("attachment");
        setStore((current) => ({ ...current, lectures: current.lectures.map((lecture) => lecture.id === lectureId ? { ...lecture, attachments: [...(lecture.attachments ?? []), { ...attachment, id, lectureId, createdAt: new Date().toISOString() }] } : lecture) })); return id;
      },
      removeAttachment: (lectureId, attachmentId) => setStore((current) => ({ ...current, lectures: current.lectures.map((lecture) => lecture.id === lectureId ? { ...lecture, attachments: (lecture.attachments ?? []).filter((attachment) => attachment.id !== attachmentId) } : lecture) })),
      updateAttachment: (lectureId, attachmentId, changes) => setStore((current) => ({ ...current, lectures: current.lectures.map((lecture) => lecture.id === lectureId ? { ...lecture, attachments: (lecture.attachments ?? []).map((attachment) => attachment.id === attachmentId ? { ...attachment, ...changes } : attachment) } : lecture) })),
      addReviewCards: (lectureId, cards) => setStore((current) => ({ ...current, reviewCards: [...current.reviewCards, ...cards.map((card) => ({ ...card, id: makeId("review"), lectureId, dueAt: new Date().toISOString(), intervalDays: 1, repetitions: 0 }))] })),
      createReviewList: (title, lectureIds) => { const id = makeId("review-list"); const normalizedTitle = normalizeRequiredTitle(title, "اسم قائمة المراجعة"); const uniqueLectureIds = Array.from(new Set(lectureIds)); setStore((current) => ({ ...current, reviewLists: [{ id, title: normalizedTitle, lectureIds: uniqueLectureIds, completedLectureIds: [], createdAt: new Date().toISOString() }, ...(current.reviewLists ?? [])] })); return id; },
      toggleReviewListLecture: (listId, lectureId) => setStore((current) => ({ ...current, reviewLists: (current.reviewLists ?? []).map((list) => list.id !== listId ? list : { ...list, completedLectureIds: list.completedLectureIds.includes(lectureId) ? list.completedLectureIds.filter((id) => id !== lectureId) : [...list.completedLectureIds, lectureId] }) })),
      deleteReviewList: (listId) => setStore((current) => ({ ...current, reviewLists: (current.reviewLists ?? []).filter((list) => list.id !== listId) })),
      addReviewSession: (durationMinutes, subjectId) => setStore((current) => ({ ...current, reviewSessions: [{ id: makeId("review-session"), durationMinutes, subjectId, completedAt: new Date().toISOString() }, ...(current.reviewSessions ?? [])].slice(0, 60) })),
      createReviewChallenge: (subjectId, targetCards) => { const id = makeId("review-challenge"); if (!store.subjects.some((subject) => subject.id === subjectId)) throw new Error("المادة غير موجودة"); if (!Number.isInteger(targetCards) || targetCards < 1 || targetCards > 999) throw new Error("حدد عدداً صحيحاً للبطاقات"); setStore((current) => ({ ...current, reviewChallenges: [{ id, subjectId, targetCards, createdAt: new Date().toISOString() }, ...(current.reviewChallenges ?? []).filter((challenge) => challenge.subjectId !== subjectId)] })); return id; },
      deleteReviewChallenge: (challengeId) => setStore((current) => ({ ...current, reviewChallenges: (current.reviewChallenges ?? []).filter((challenge) => challenge.id !== challengeId) })),
      setSubjectTermGoal: (subjectId, targets) => { if (!store.subjects.some((subject) => subject.id === subjectId)) throw new Error("المادة غير موجودة"); const normalized = normalizeSubjectTermGoalTargets(targets); setStore((current) => ({ ...current, subjectGoals: [{ subjectId, ...normalized, updatedAt: new Date().toISOString(), nearGoalReminderNotifiedAt: undefined }, ...(current.subjectGoals ?? []).filter((goal) => goal.subjectId !== subjectId)] })); },
      setSubjectWeeklyGoal: (subjectId, targets) => { if (!store.subjects.some((subject) => subject.id === subjectId)) throw new Error("المادة غير موجودة"); const normalized = normalizeWeeklyGoalTargets(targets); const weekStart = getWeekStartIso(); setStore((current) => ({ ...current, weeklySubjectGoals: [{ subjectId, weekStart, ...normalized, updatedAt: new Date().toISOString(), lateReminderNotifiedAt: undefined }, ...(current.weeklySubjectGoals ?? []).filter((goal) => !(goal.subjectId === subjectId && goal.weekStart === weekStart))] })); },
      markSubjectWeeklyGoalLateReminder: (subjectId, weekStart) => setStore((current) => ({ ...current, weeklySubjectGoals: (current.weeklySubjectGoals ?? []).map((goal) => goal.subjectId === subjectId && goal.weekStart === weekStart ? { ...goal, lateReminderNotifiedAt: new Date().toISOString() } : goal) })),
      replaceSubjectGoalSettings: (subjectGoals, weeklySubjectGoals) => setStore((current) => ({ ...current, subjectGoals: subjectGoals ?? [], weeklySubjectGoals: weeklySubjectGoals ?? [] })),
      saveWeeklyReflection: (weekStart, note, attributes) => setStore((current) => ({ ...current, weeklyReflections: [normalizeWeeklyReflection(weekStart, note, attributes), ...(current.weeklyReflections ?? []).filter((reflection) => reflection.weekStart !== weekStart)] })),
      markSubjectGoalNearReminder: (subjectId) => setStore((current) => ({ ...current, subjectGoals: (current.subjectGoals ?? []).map((goal) => goal.subjectId === subjectId ? { ...goal, nearGoalReminderNotifiedAt: new Date().toISOString() } : goal) })),
      reviewCard: (cardId, correct) => setStore((current) => ({ ...current, reviewCards: current.reviewCards.map((card) => {
        if (card.id !== cardId) return card;
        return { ...card, ...scheduleReview(card, correct ? "good" : "again") };
      }) })),
      gradeReviewCard: (cardId, grade) => setStore((current) => ({ ...current, reviewCards: current.reviewCards.map((card) => card.id === cardId ? { ...card, ...scheduleReview(card, grade) } : card) })),
      addTask: (task) => { const id = makeId("task"); setStore((current) => ({ ...current, tasks: [...current.tasks, { ...task, id, completed: false, createdAt: new Date().toISOString() }] })); return id; },
      updateTask: (taskId, changes) => setStore((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === taskId ? { ...task, ...changes } : task) })),
      updateSyncSettings: (changes) => setStore((current) => ({ ...current, syncSettings: { ...current.syncSettings, ...changes } })),
      addBackupActivity: (activity) => setStore((current) => ({ ...current, backupActivities: [{ ...activity, id: makeId("backup-activity"), createdAt: new Date().toISOString() }, ...(current.backupActivities ?? [])].slice(0, 30) })),
      replaceStoreFromBackup: (backup) => setStore(normalizeStore({ ...backup, syncSettings: { ...backup.syncSettings, cloudBackupEnabled: true, lastBackupStatus: "completed", lastBackupAt: new Date().toISOString() } })),
      replaceStoreFromLocalImport: (nextStore, snapshotLabel) => setStore((current) => { const history = snapshotLabel ? [createReplacementSnapshot(makeId("replace-snapshot"), snapshotLabel, current, new Date().toISOString()), ...(current.replacementSnapshots ?? [])].slice(0, 3) : (current.replacementSnapshots ?? []); return normalizeStore({ ...nextStore, replacementSnapshots: history }); }),
      restoreReplacementSnapshot: (snapshotId) => setStore((current) => { const snapshot = (current.replacementSnapshots ?? []).find((item) => item.id === snapshotId); if (!snapshot) return current; const safety = createReplacementSnapshot(makeId("replace-snapshot"), "حالة قبل الاستعادة", current, new Date().toISOString()); return normalizeStore(restoreSnapshot(current, snapshot, safety)); }),
      deleteReplacementSnapshot: (snapshotId) => setStore((current) => ({ ...current, replacementSnapshots: (current.replacementSnapshots ?? []).filter((item) => item.id !== snapshotId) })),
      getYear, getTerm, getSubject,
      getTermForYear: (yearId, kind) => store.terms.find((term) => term.yearId === yearId && term.kind === kind),
      getLecturesForSubject: (subjectId, section) => store.lectures.filter((lecture) => lecture.subjectId === subjectId && (!section || lecture.section === section)),
    };
  }, [hydrated, store]);

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudy() { const context = useContext(StudyContext); if (!context) throw new Error("يجب استخدام useStudy داخل StudyProvider."); return context; }
export type { LectureSummary };
