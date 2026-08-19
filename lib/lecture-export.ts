import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { buildLectureExportHtml } from "@/lib/lecture-export-template";
import type { Lecture, Subject } from "@/lib/study-types";

export { buildLectureExportHtml, formatBytes } from "@/lib/lecture-export-template";

export async function exportLecturePdf(lecture: Lecture, subject?: Subject) {
  const result = await Print.printToFileAsync({ html: buildLectureExportHtml(lecture, subject), margins: { top: 28, bottom: 28, left: 24, right: 24 } });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "مشاركة ملخص المحاضرة" });
  }
  return result.uri;
}
