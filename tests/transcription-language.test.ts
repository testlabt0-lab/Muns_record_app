import { describe, expect, it } from "vitest";
import { getTranscriptionRequestOptions } from "../shared/transcription-language";

describe("لغة تحويل المحاضرة", () => {
  it("يستخدم العربية كقيمة آمنة افتراضية", () => {
    expect(getTranscriptionRequestOptions(undefined)).toEqual({ language: "ar", prompt: "هذه محاضرة جامعية باللغة العربية. اكتب النص بدقة، مع الحفاظ على المصطلحات العلمية." });
    expect(getTranscriptionRequestOptions("غير-مدعوم").language).toBe("ar");
  });

  it("يمرر خيارات الإنجليزية والمختلطة بصورة واضحة", () => {
    expect(getTranscriptionRequestOptions("en")).toEqual({ language: "en", prompt: "This is a university lecture in English. Transcribe accurately and preserve scientific terms." });
    expect(getTranscriptionRequestOptions("mixed").language).toBeUndefined();
    expect(getTranscriptionRequestOptions("mixed").prompt).toContain("العربية والإنجليزية");
  });
});
