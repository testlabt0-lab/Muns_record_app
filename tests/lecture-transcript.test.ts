import { describe, expect, it } from "vitest";
import { getLectureTranscript, getTranscriptLanguageLabel, normalizeEditedTranscript } from "../lib/lecture-transcript";

describe("نص المحاضرة المحلي", () => {
  it("يعرض النص المحرر محلياً من دون إلغاء النص الأصلي", () => {
    expect(getLectureTranscript({ transcript: "النص الأصلي", transcriptEditedText: " النص المراجع " })).toBe("النص المراجع");
    expect(getLectureTranscript({ transcript: "النص الأصلي" })).toBe("النص الأصلي");
  });

  it("ينظف إدخال التحرير ويحافظ على الفقرات ويعرّف اللغات المدعومة", () => {
    expect(normalizeEditedTranscript("  سطر أول\r\n\r\n\r\nسطر ثانٍ  ")).toBe("سطر أول\n\nسطر ثانٍ");
    expect(getTranscriptLanguageLabel("mixed")).toBe("عربي + إنجليزي");
    expect(getTranscriptLanguageLabel(undefined)).toBe("العربية");
  });
});
