import { describe, expect, it } from "vitest";
import { isSupportedAudioMimeType, titleFromImportedAudioFile } from "../lib/import-recording";

describe("استيراد التسجيلات السابقة", () => {
  it("ينشئ عنواناً مقروءاً من اسم الملف", () => {
    expect(titleFromImportedAudioFile("lecture_03-final.m4a")).toBe("lecture 03 final");
    expect(titleFromImportedAudioFile(".m4a")).toBe("تسجيل مستورد");
  });

  it("يقبل نوع الصوت ويرفض المستندات", () => {
    expect(isSupportedAudioMimeType("audio/mpeg")).toBe(true);
    expect(isSupportedAudioMimeType("application/pdf")).toBe(false);
    expect(isSupportedAudioMimeType(undefined)).toBe(false);
  });
});
