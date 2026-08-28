import { getSummaryStyleLabel, type SummaryStyle } from "../shared/summary-style";
import type { Lecture, LectureSummary, LectureSummaryVersion } from "@/lib/study-types";

export function normalizeSummaryLines(value: string) {
  return Array.from(new Set(value.split(/\r?\n/).map((line) => line.replace(/^[-•]\s*/, "").trim()).filter(Boolean)));
}

export function validateLectureSummaryDraft(input: { overview: string; keyPoints: string; terms: string; reviewQuestions: string }): LectureSummary | undefined {
  const overview = input.overview.trim().replace(/\s+/g, " ");
  const keyPoints = normalizeSummaryLines(input.keyPoints);
  const terms = normalizeSummaryLines(input.terms);
  const reviewQuestions = normalizeSummaryLines(input.reviewQuestions);
  if (overview.length < 10 || keyPoints.length < 2 || keyPoints.length > 8 || terms.length > 12 || reviewQuestions.length < 2 || reviewQuestions.length > 6) return undefined;
  return { overview, keyPoints, terms, reviewQuestions };
}

export function getLectureSummaryVersions(lecture: Pick<Lecture, "summary" | "summaryVersions" | "recordedAt">): LectureSummaryVersion[] {
  if (lecture.summaryVersions?.length) return lecture.summaryVersions;
  if (!lecture.summary) return [];
  return [{ id: "legacy-summary", style: "quick", summary: lecture.summary, source: "ai", createdAt: lecture.recordedAt }];
}

export function createSummaryVersion(summary: LectureSummary, style: SummaryStyle, createdAt: string, id: string): LectureSummaryVersion {
  return { id, style, summary, createdAt, source: "ai" };
}

export { getSummaryStyleLabel };
