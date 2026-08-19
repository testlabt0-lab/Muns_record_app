import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getEncryptionKey() {
  const raw = process.env.AUDIO_BACKUP_ENCRYPTION_KEY;
  if (!raw) throw new Error("مفتاح تشفير النسخ الاحتياطي غير مهيأ.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("مفتاح تشفير النسخ الاحتياطي يجب أن يكون 32 بايت بصيغة Base64.");
  return key;
}

export function isAudioBackupEncryptionConfigured() {
  try { getEncryptionKey(); return true; } catch { return false; }
}

export function encryptAudioBackup(data: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { encrypted: Buffer.concat([iv, tag, encrypted]), ivLength: iv.length, tagLength: tag.length };
}

export function decryptAudioBackup(data: Buffer, ivLength: number, tagLength: number) {
  const iv = data.subarray(0, ivLength);
  const tag = data.subarray(ivLength, ivLength + tagLength);
  const ciphertext = data.subarray(ivLength + tagLength);
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
