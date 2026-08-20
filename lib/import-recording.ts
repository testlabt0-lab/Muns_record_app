export function titleFromImportedAudioFile(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();
  return withoutExtension || "تسجيل مستورد";
}

export function isSupportedAudioMimeType(mimeType: string | null | undefined) {
  return Boolean(mimeType && mimeType.startsWith("audio/"));
}
