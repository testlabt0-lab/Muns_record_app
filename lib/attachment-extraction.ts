export const MAX_ATTACHMENT_EXTRACTION_BYTES = 6 * 1024 * 1024;

export function isImageExtractionSupported(mimeType: string) {
  return /^image\/(jpeg|jpg|png|webp)$/i.test(mimeType);
}

export function getAttachmentExtractionError(mimeType: string, sizeBytes?: number) {
  if (!isImageExtractionSupported(mimeType)) return "استخراج النص متاح حالياً لصور JPG وPNG وWebP فقط.";
  if (sizeBytes && sizeBytes > MAX_ATTACHMENT_EXTRACTION_BYTES) return "الصورة أكبر من 6 ميغابايت. اختر نسخة أصغر أو قص الصورة ثم أعد المحاولة.";
  return null;
}
