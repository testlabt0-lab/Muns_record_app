export type TermKind = "first" | "second";
export type SubjectSection = "theory" | "practical";
export type ProcessingStatus = "local" | "ready" | "processing" | "completed" | "failed";
export type AttachmentKind = "image" | "pdf" | "document";
export type TaskKind = "assignment" | "exam" | "review";
export type TranscriptLanguage = "ar" | "en" | "mixed";

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

export interface SubjectTermGoal {
  subjectId: string;
  lectureTarget: number;
  reviewTarget: number;
  focusMinutesTarget: number;
  updatedAt: string;
  nearGoalReminderNotifiedAt?: string;
}

export interface SubjectWeeklyGoal {
  subjectId: string;
  weekStart: string;
  reviewTarget: number;
  focusMinutesTarget: number;
  updatedAt: string;
  lateReminderNotifiedAt?: string;
  lateReminderThresholdPercent?: number;
}

export interface SubjectSmartReminder {
  subjectId: string;
  weekStart: string;
  enabled: boolean;
  weekday: 5 | 6 | 7;
  hour: number;
  minute: 0 | 30;
  notificationId?: string;
}

export interface WeeklyReflection {
  weekStart: string;
  note: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  focusAreas?: ReflectionFocusArea[];
  followUpGoal?: string;
  followUpCompleted?: boolean;
  followUpCompletedAt?: string;
  followUpPriority?: FollowUpPriority;
  followUpDueAt?: string;
  followUpSubjectId?: string;
  followUpRepeatsWeekly?: boolean;
  followUpCreatedAt?: string;
  followUpOverdueReminderNotificationId?: string;
  followUpOverdueReminderScheduleKey?: string;
  updatedAt: string;
}

export type ReflectionFocusArea = "review" | "organization" | "focus" | "wellbeing";
export type FollowUpPriority = "high" | "medium" | "low";
export type FollowUpActivityType = "created" | "completed" | "reopened" | "postponed" | "updated";

export interface FollowUpFilterPreset {
  id: string;
  title: string;
  status: "all" | "open" | "completed";
  sort: "smart" | "recent" | "priority" | "due";
  subjectFilter: string;
  priorityFilter: "all" | FollowUpPriority;
  dueFilter: "all" | "overdue" | "today" | "week" | "unscheduled";
  createdAt: string;
}

export interface FollowUpActivity {
  id: string;
  weekStart: string;
  type: FollowUpActivityType;
  subjectId?: string;
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
  extractionStatus?: ProcessingStatus;
  extractedText?: string;
  extractionKeyPoints?: string[];
  extractionReviewCards?: { question: string; answer: string }[];
  extractionReviewCardsAddedAt?: string;
  extractionError?: string;
  extractedAt?: string;
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

export interface TranscribedAudioPart {
  sourceId: string;
  text: string;
  segments: TranscriptSegment[];
  completedAt: string;
}

export interface LectureBookmark {
  id: string;
  label: string;
  seconds: number;
  createdAt: string;
}

export interface LectureNote {
  id: string;
  text: string;
  timestampSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Lecture {
  id: string;
  subjectId: string;
  section: SubjectSection;
  title: string;
  recordedAt: string;
  archivedAt?: string;
  tags?: string[];
  tagColors?: Record<string, string>;
  bookmarks?: LectureBookmark[];
  notes?: LectureNote[];
  durationSeconds: number;
  lastPlaybackPositionSeconds?: number;
  lastPlaybackUpdatedAt?: string;
  audioUri?: string;
  audioSizeBytes?: number;
  audioParts?: LectureAudioPart[];
  transcript?: string;
  transcriptEditedText?: string;
  transcriptEditedAt?: string;
  transcriptionLanguage?: TranscriptLanguage;
  transcriptSegments?: TranscriptSegment[];
  transcribedAudioParts?: TranscribedAudioPart[];
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

export interface ReviewList {
  id: string;
  title: string;
  lectureIds: string[];
  completedLectureIds: string[];
  createdAt: string;
}

export interface ReviewSession {
  id: string;
  durationMinutes: number;
  subjectId?: string;
  completedAt: string;
}

export interface SubjectReviewChallenge {
  id: string;
  subjectId: string;
  targetCards: number;
  createdAt: string;
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
  weeklyReflectionReminderEnabled?: boolean;
  weeklyReflectionReminderNotificationId?: string;
  weeklyReflectionReminderHour?: number;
  weeklyReflectionReminderMinute?: number;
  weeklyReflectionFollowUpReminderEnabled?: boolean;
  weeklyReflectionFollowUpReminderNotificationId?: string;
  weeklyReflectionFollowUpDueReminderEnabled?: boolean;
  weeklyReflectionFollowUpDueReminderNotificationId?: string;
  weeklyReflectionFollowUpOverdueReminderEnabled?: boolean;
  weeklyReflectionFollowUpOverdueReminderTime?: "morning" | "evening";
  weeklyReflectionFollowUpMonthlyGoal?: number;
  weeklyReflectionFollowUpStreakReminderEnabled?: boolean;
  weeklyReflectionFollowUpStreakReminderNotifiedForWeek?: string;
  weeklyLectureGoal?: number;
  weeklyReviewGoal?: number;
  weeklyGoalNotificationEnabled?: boolean;
  weeklyGoalNotificationWeekKey?: string;
  dailyFocusGoalMinutes?: number;
  dailyFocusReminderEnabled?: boolean;
  dailyFocusReminderNotificationId?: string;
  weeklyReviewDays?: number[];
  weeklyReviewReminderEnabled?: boolean;
  weeklyReviewReminderNotificationIds?: string[];
  weeklyReviewReminderHour?: number;
  weeklyReviewReminderMinute?: number;
  appearanceMode?: "light" | "dark";
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

export interface ReplacementSnapshot {
  id: string;
  label: string;
  createdAt: string;
  data: Omit<StudyStore, "replacementSnapshots">;
}

export interface StudyStore {
  years: AcademicYear[];
  terms: AcademicTerm[];
  subjects: Subject[];
  subjectGoals?: SubjectTermGoal[];
  weeklySubjectGoals?: SubjectWeeklyGoal[];
  subjectSmartReminders?: SubjectSmartReminder[];
  weeklyReflections?: WeeklyReflection[];
  followUpFilterPresets?: FollowUpFilterPreset[];
  followUpActivities?: FollowUpActivity[];
  lectures: Lecture[];
  reviewCards: ReviewCard[];
  reviewLists?: ReviewList[];
  reviewSessions?: ReviewSession[];
  reviewChallenges?: SubjectReviewChallenge[];
  tasks: StudyTask[];
  syncSettings: SyncSettings;
  backupActivities?: BackupActivity[];
  replacementSnapshots?: ReplacementSnapshot[];
}
