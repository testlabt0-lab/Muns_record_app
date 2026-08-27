import { describe, expect, it } from "vitest";

import { getActiveAudioPartForShare, getAudioShareMimeType } from "../lib/lecture-audio-share";

const parts = [
  { id: "part-1", index: 1, uri: "file:///lecture-1.m4a", durationSeconds: 60, createdAt: "2026-08-27T10:00:00.000Z" },
  { id: "part-2", index: 2, uri: "file:///lecture-2.mp3?cache=1", durationSeconds: 60, createdAt: "2026-08-27T10:01:00.000Z" },
];

describe("مشاركة تسجيل المحاضرة", () => {
  it("يعيد الجزء النشط فقط ولا يقبل فهرساً خارج الأجزاء", () => {
    expect(getActiveAudioPartForShare(parts, 1)?.id).toBe("part-2");
    expect(getActiveAudioPartForShare(parts, -1)).toBeUndefined();
    expect(getActiveAudioPartForShare(parts, 2)).toBeUndefined();
  });

  it("يحدد نوع MIME المناسب لامتداد الملف", () => {
    expect(getAudioShareMimeType("file:///recording.mp3")).toBe("audio/mpeg");
    expect(getAudioShareMimeType("file:///recording.wav")).toBe("audio/wav");
    expect(getAudioShareMimeType("file:///recording.aac")).toBe("audio/aac");
    expect(getAudioShareMimeType("file:///recording.m4a")).toBe("audio/mp4");
  });
});
