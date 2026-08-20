import { describe, expect, it } from "vitest";
import { MAX_ATTACHMENT_EXTRACTION_BYTES, getAttachmentExtractionError, isImageExtractionSupported } from "../lib/attachment-extraction";

describe("استخراج النص من المرفقات", () => {
  it("يقبل أنواع الصور المدعومة فقط", () => {
    expect(isImageExtractionSupported("image/jpeg")).toBe(true);
    expect(isImageExtractionSupported("image/png")).toBe(true);
    expect(isImageExtractionSupported("application/pdf")).toBe(false);
  });

  it("يرفض الصورة التي تتجاوز الحد قبل إرسالها للخادم", () => {
    expect(getAttachmentExtractionError("image/jpeg", MAX_ATTACHMENT_EXTRACTION_BYTES + 1)).toContain("6 ميغابايت");
    expect(getAttachmentExtractionError("application/pdf", 100)).toContain("صور JPG");
    expect(getAttachmentExtractionError("image/webp", MAX_ATTACHMENT_EXTRACTION_BYTES)).toBeNull();
  });
});
