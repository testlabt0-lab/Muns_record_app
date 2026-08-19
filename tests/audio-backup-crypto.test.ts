import { describe, expect, it } from "vitest";

import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";
import { decryptAudioBackup, encryptAudioBackup } from "../server/audio-backup-crypto";

describe("مفتاح النسخ الصوتي المشفر", () => {
  it("يُتحقق منه عبر نقطة صحة خفيفة من دون كشف قيمته", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.backupCrypto.health()).resolves.toEqual({ configured: true });
  });

  it("يستعيد البيانات بعد تشفير AES-GCM من دون الاحتفاظ بنص واضح", () => {
    const source = Buffer.from("lecture-private-audio");
    const encrypted = encryptAudioBackup(source);
    expect(encrypted.encrypted.equals(source)).toBe(false);
    expect(decryptAudioBackup(encrypted.encrypted, encrypted.ivLength, encrypted.tagLength)).toEqual(source);
  });
});
