import { describe, expect, it } from "vitest";
import { getRecordingExitIntent, getRecordingPartHint } from "../lib/recording-stability";

describe("استقرار التسجيل", () => {
  it("يمنع الخروج أثناء التسجيل أو تبديل الجزء ويطلب الحفظ للأجزاء الجاهزة", () => {
    expect(getRecordingExitIntent({ isRecording: true, isTransitioningPart: false, finalized: false, partCount: 0 })).toBe("finish-recording");
    expect(getRecordingExitIntent({ isRecording: false, isTransitioningPart: true, finalized: false, partCount: 1 })).toBe("finish-recording");
    expect(getRecordingExitIntent({ isRecording: false, isTransitioningPart: false, finalized: true, partCount: 1 })).toBe("save-recording");
    expect(getRecordingExitIntent({ isRecording: false, isTransitioningPart: false, finalized: false, partCount: 0 })).toBe("leave");
  });

  it("يعرض حد التقسيم الفعلي ضمن الحدود المدعومة", () => {
    expect(getRecordingPartHint(35)).toContain("35 دقيقة");
    expect(getRecordingPartHint(2)).toContain("5 دقيقة");
    expect(getRecordingPartHint(90)).toContain("60 دقيقة");
  });
});
