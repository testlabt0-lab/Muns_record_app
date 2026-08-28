import { getLectureSummaryVersions } from "./lecture-summaries";
import { getLectureTranscript } from "./lecture-transcript";
import type { Lecture, Subject } from "./study-types";

export function buildLectureSearchText(lecture: Lecture, subject?: Subject) {
  const versions = getLectureSummaryVersions(lecture);
  const summary = versions.find((version) => version.id === lecture.activeSummaryVersionId)?.summary ?? versions.at(-1)?.summary ?? lecture.summary;
  return [
    lecture.title,
    getLectureTranscript(lecture),
    summary?.overview,
    ...(summary?.keyPoints ?? []),
    ...(summary?.terms ?? []),
    ...(summary?.reviewQuestions ?? []),
    ...(lecture.notes ?? []).map((note) => note.text),
    ...(lecture.tags ?? []),
    subject?.title,
    subject?.theoryInstructor,
    subject?.practicalInstructor,
    ...(lecture.attachments ?? []).flatMap((attachment) => [attachment.title, attachment.extractedText, ...(attachment.extractionKeyPoints ?? [])]),
  ].filter(Boolean).join(" ").toLocaleLowerCase("ar");
}
