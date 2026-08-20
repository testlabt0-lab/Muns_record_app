export function titleFromImportedAudioFile(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();
  return withoutExtension || "تسجيل مستورد";
}

const AUDIO_EXTENSION = /\.(m4a|mp3|wav|aac|ogg|opus|flac|webm)$/i;

export function isSupportedAudioMimeType(mimeType: string | null | undefined) {
  return Boolean(mimeType && mimeType.startsWith("audio/"));
}

export function isSupportedAudioFile(mimeType: string | null | undefined, fileName: string) {
  return isSupportedAudioMimeType(mimeType) || AUDIO_EXTENSION.test(fileName.trim());
}
