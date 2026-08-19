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

export function attachmentKindFromMime(mimeType?: string) {
  if (mimeType?.startsWith("image/")) return "image" as const;
  if (mimeType === "application/pdf") return "pdf" as const;
  return "document" as const;
}
