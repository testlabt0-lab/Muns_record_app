import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

export async function persistAttachment(uri: string, originalName: string) {
  if (Platform.OS === "web") return uri;
  const attachmentsDir = new Directory(Paths.document, "lecture-attachments");
  if (!attachmentsDir.exists) attachmentsDir.create({ intermediates: true });
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const extension = safeName.includes(".") ? "" : ".bin";
  const destination = new File(attachmentsDir, `${Date.now()}-${safeName}${extension}`);
  new File(uri).copy(destination);
  return destination.uri;
}

export function removePersistedAttachment(uri: string) {
  if (Platform.OS === "web") return false;
  const file = new File(uri);
  if (!file.exists) return false;
  file.delete();
  return true;
}

export async function persistBase64Attachment(dataBase64: string, originalName: string) {
  if (Platform.OS === "web") throw new Error("تتطلب استعادة الملفات تطبيق الهاتف.");
  const attachmentsDir = new Directory(Paths.document, "restored-backups");
  if (!attachmentsDir.exists) attachmentsDir.create({ intermediates: true });
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const extension = safeName.includes(".") ? "" : ".bin";
  const destination = new File(attachmentsDir, `${Date.now()}-${safeName}${extension}`);
  destination.write(dataBase64, { encoding: "base64" });
  return { uri: destination.uri, sizeBytes: destination.size ?? 0 };
}

export function attachmentKindFromMime(mimeType?: string) {
  if (mimeType?.startsWith("image/")) return "image" as const;
  if (mimeType === "application/pdf") return "pdf" as const;
  return "document" as const;
}
