import { beforeAll } from "vitest";

// مفتاح اصطناعي للاختبارات فقط. لا يُستخدم خارج بيئة Vitest ولا يُحفظ كمفتاح إنتاج.
beforeAll(() => {
  if (!process.env.AUDIO_BACKUP_ENCRYPTION_KEY) {
    process.env.AUDIO_BACKUP_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  }
});
