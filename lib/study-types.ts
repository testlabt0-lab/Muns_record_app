export type TermKind = "first" | "second";
export type SubjectSection = "theory" | "practical";
export type ProcessingStatus = "local" | "ready" | "processing" | "completed" | "failed";
export type AttachmentKind = "image" | "pdf" | "document";
export type TaskKind = "assignment" | "exam" | "review";

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

export interface TranscriptSegment {
  id: string;
  text: string;
  startSeconds: number;
  endSeconds: number;
}

export interface LectureAttachment {
  id: string;
  lectureId: string;
  kind: AttachmentKind;
  title: string;
  uri: string;
  mimeType: string;
  sizeBytes?: number;
  createdAt: string;
}

export interface LectureAudioPart {
  id: string;
  index: number;
  uri: string;
  durationSeconds: number;
  sizeBytes?: number;
  createdAt: string;
}

export interface Lecture {
  id: string;
  subjectId: string;
  section: SubjectSection;
  title: string;
  recordedAt: string;
  archivedAt?: string;
  durationSeconds: number;
  audioUri?: string;
  audioSizeBytes?: number;
  audioParts?: LectureAudioPart[];
  transcript?: string;
  transcriptSegments?: TranscriptSegment[];
  summary?: LectureSummary;
  transcriptionStatus: ProcessingStatus;
  summaryStatus: ProcessingStatus;
  transcriptionProgress?: number;
  summaryProgress?: number;
  retryReason?: string;
  attachments?: LectureAttachment[];
}

export interface LectureSummary {
  overview: string;
  keyPoints: string[];
  terms: string[];
  reviewQuestions: string[];
}

export interface ReviewCard {
  id: string;
  lectureId: string;
  question: string;
  answer: string;
  dueAt: string;
  intervalDays: number;
  repetitions: number;
  lastReviewedAt?: string;
}

export interface StudyTask {
  id: string;
  subjectId?: string;
  title: string;
  kind: TaskKind;
  dueAt: string;
  completed: boolean;
  notificationId?: string;
  calendarEventId?: string;
  createdAt: string;
}

export interface SyncSettings {
  cloudBackupEnabled: boolean;
  recordingPartMinutes?: number;
  preferredPlaybackRate?: number;
  storageWarningPercent?: number;
  weeklyDigestEnabled?: boolean;
  weeklyDigestNotificationId?: string;
  lastBackupAt?: string;
  lastBackupStatus?: "idle" | "completed" | "failed";
}

export interface BackupActivity {
  id: string;
  action: "backup" | "restore" | "media-backup" | "media-restore";
  status: "completed" | "failed" | "paused";
  message: string;
  fileCount?: number;
  createdAt: string;
}

export interface StudyStore {
  years: AcademicYear[];
  terms: AcademicTerm[];
  subjects: Subject[];
  lectures: Lecture[];
  reviewCards: ReviewCard[];
  tasks: StudyTask[];
  syncSettings: SyncSettings;
  backupActivities?: BackupActivity[];
}
