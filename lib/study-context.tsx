import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { createActiveAcademicYear, deactivateAcademicYears, findOrCreateTerm, normalizeRequiredTitle } from "@/lib/study-domain";
import type { AcademicTerm, AcademicYear, Lecture, LectureAttachment, LectureSummary, ReviewCard, StudyStore, StudyTask, Subject, SubjectSection, TermKind } from "@/lib/study-types";

const STORE_KEY = "muhadir.study-store.v1";

const emptyStore: StudyStore = {
  years: [], terms: [], subjects: [], lectures: [], reviewCards: [], tasks: [],
  syncSettings: { cloudBackupEnabled: false, recordingPartMinutes: 20, lastBackupStatus: "idle" },
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
  addAttachment: (lectureId: string, attachment: Omit<LectureAttachment, "id" | "lectureId" | "createdAt">) => string;
  removeAttachment: (lectureId: string, attachmentId: string) => void;
  addReviewCards: (lectureId: string, cards: Array<Pick<ReviewCard, "question" | "answer">>) => void;
  reviewCard: (cardId: string, correct: boolean) => void;
  addTask: (task: Omit<StudyTask, "id" | "createdAt" | "completed">) => string;
  updateTask: (taskId: string, changes: Partial<Pick<StudyTask, "title" | "dueAt" | "completed" | "notificationId" | "calendarEventId">>) => void;
  updateSyncSettings: (changes: Partial<StudyStore["syncSettings"]>) => void;
  replaceStoreFromBackup: (backup: Partial<StudyStore>) => void;
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
    years: value.years ?? [], terms: value.terms ?? [], subjects: value.subjects ?? [],
    lectures: value.lectures?.map((lecture) => ({ ...lecture, attachments: lecture.attachments ?? [], transcriptSegments: lecture.transcriptSegments ?? [], audioParts: lecture.audioParts ?? (lecture.audioUri ? [{ id: `${lecture.id}-legacy`, index: 1, uri: lecture.audioUri, durationSeconds: lecture.durationSeconds, sizeBytes: lecture.audioSizeBytes, createdAt: lecture.recordedAt }] : []) })) ?? [],
    reviewCards: value.reviewCards ?? [], tasks: value.tasks ?? [],
    syncSettings: { cloudBackupEnabled: false, recordingPartMinutes: 20, lastBackupStatus: "idle", ...value.syncSettings },
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
        setStore((current) => ({ ...current, lectures: [{ ...input, id, recordedAt: new Date().toISOString(), transcriptionStatus: input.transcriptionStatus ?? "local", summaryStatus: input.summaryStatus ?? "local", attachments: input.attachments ?? [], transcriptSegments: input.transcriptSegments ?? [] }, ...current.lectures] })); return id;
      },
      updateLecture: (lectureId, changes) => setStore((current) => ({ ...current, lectures: current.lectures.map((lecture) => lecture.id === lectureId ? { ...lecture, ...changes } : lecture) })),
      deleteLecture: (lectureId) => setStore((current) => ({ ...current, lectures: current.lectures.filter((lecture) => lecture.id !== lectureId), reviewCards: current.reviewCards.filter((card) => card.lectureId !== lectureId) })),
      addAttachment: (lectureId, attachment) => {
        const id = makeId("attachment");
        setStore((current) => ({ ...current, lectures: current.lectures.map((lecture) => lecture.id === lectureId ? { ...lecture, attachments: [...(lecture.attachments ?? []), { ...attachment, id, lectureId, createdAt: new Date().toISOString() }] } : lecture) })); return id;
      },
      removeAttachment: (lectureId, attachmentId) => setStore((current) => ({ ...current, lectures: current.lectures.map((lecture) => lecture.id === lectureId ? { ...lecture, attachments: (lecture.attachments ?? []).filter((attachment) => attachment.id !== attachmentId) } : lecture) })),
      addReviewCards: (lectureId, cards) => setStore((current) => ({ ...current, reviewCards: [...current.reviewCards, ...cards.map((card) => ({ ...card, id: makeId("review"), lectureId, dueAt: new Date().toISOString(), intervalDays: 1, repetitions: 0 }))] })),
      reviewCard: (cardId, correct) => setStore((current) => ({ ...current, reviewCards: current.reviewCards.map((card) => {
        if (card.id !== cardId) return card;
        const intervalDays = correct ? Math.min(30, Math.max(1, card.intervalDays * 2)) : 1;
        return { ...card, intervalDays, dueAt: new Date(Date.now() + intervalDays * 86_400_000).toISOString(), repetitions: correct ? card.repetitions + 1 : 0, lastReviewedAt: new Date().toISOString() };
      }) })),
      addTask: (task) => { const id = makeId("task"); setStore((current) => ({ ...current, tasks: [...current.tasks, { ...task, id, completed: false, createdAt: new Date().toISOString() }] })); return id; },
      updateTask: (taskId, changes) => setStore((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === taskId ? { ...task, ...changes } : task) })),
      updateSyncSettings: (changes) => setStore((current) => ({ ...current, syncSettings: { ...current.syncSettings, ...changes } })),
      replaceStoreFromBackup: (backup) => setStore(normalizeStore({ ...backup, syncSettings: { ...backup.syncSettings, cloudBackupEnabled: true, lastBackupStatus: "completed", lastBackupAt: new Date().toISOString() } })),
      getYear, getTerm, getSubject,
      getTermForYear: (yearId, kind) => store.terms.find((term) => term.yearId === yearId && term.kind === kind),
      getLecturesForSubject: (subjectId, section) => store.lectures.filter((lecture) => lecture.subjectId === subjectId && (!section || lecture.section === section)),
    };
  }, [hydrated, store]);

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudy() { const context = useContext(StudyContext); if (!context) throw new Error("يجب استخدام useStudy داخل StudyProvider."); return context; }
export type { LectureSummary };
