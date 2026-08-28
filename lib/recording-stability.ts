export type RecordingExitIntent = "finish-recording" | "save-recording" | "leave";

export function getRecordingExitIntent({ isRecording, isTransitioningPart, finalized, partCount }: { isRecording: boolean; isTransitioningPart: boolean; finalized: boolean; partCount: number }): RecordingExitIntent {
  if (isRecording || isTransitioningPart) return "finish-recording";
  if (finalized && partCount > 0) return "save-recording";
  return "leave";
}

export function getRecordingPartHint(minutes: number) {
  const normalized = Math.max(5, Math.min(60, Math.round(minutes)));
  return `يفصل التطبيق التسجيل تلقائياً كل ${normalized} دقيقة، ويحوّل كل جزء ثم يدمج النص والملخص.`;
}
