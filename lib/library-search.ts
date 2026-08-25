import type { Lecture, Subject } from "./study-types";

export function buildLectureSearchText(lecture: Lecture, subject?: Subject) {
  return [
    lecture.title,
    lecture.transcript,
    lecture.summary?.overview,
    ...(lecture.summary?.keyPoints ?? []),
    ...(lecture.summary?.terms ?? []),
    ...(lecture.summary?.reviewQuestions ?? []),
    ...(lecture.tags ?? []),
    ...(lecture.notes ?? []).map((note) => note.text),
    subject?.title,
    subject?.theoryInstructor,
    subject?.practicalInstructor,
    ...(lecture.attachments ?? []).flatMap((attachment) => [attachment.title, attachment.extractedText, ...(attachment.extractionKeyPoints ?? [])]),
  ].filter(Boolean).join(" ").toLocaleLowerCase("ar");
}
