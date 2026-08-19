export type TermKind = "first" | "second";
export type SubjectSection = "theory" | "practical";
export type ProcessingStatus = "local" | "ready" | "processing" | "completed" | "failed";

export interface AcademicYear {
  id: string;
  title: string;
  isActive: boolean;
  archived: boolean;
  createdAt: string;
}

export interface AcademicTerm {
  id: string;
  yearId: string;
  kind: TermKind;
  title: string;
  createdAt: string;
}

export interface Subject {
  id: string;
  termId: string;
  title: string;
  color: string;
  hasPracticalSection: boolean;
  theoryInstructor: string;
  practicalInstructor?: string;
  createdAt: string;
}

export interface Lecture {
  id: string;
  subjectId: string;
  section: SubjectSection;
  title: string;
  recordedAt: string;
  durationSeconds: number;
  audioUri?: string;
  transcript?: string;
  summary?: LectureSummary;
  transcriptionStatus: ProcessingStatus;
  summaryStatus: ProcessingStatus;
}

export interface LectureSummary {
  overview: string;
  keyPoints: string[];
  terms: string[];
  reviewQuestions: string[];
}

export interface StudyStore {
  years: AcademicYear[];
  terms: AcademicTerm[];
  subjects: Subject[];
  lectures: Lecture[];
}
