import type { AcademicTerm, AcademicYear, Subject, SubjectSection, TermKind } from "@/lib/study-types";

export function normalizeRequiredTitle(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`اكتب ${label} أولاً.`);
  return normalized;
}

export function createActiveAcademicYear(id: string, title: string, createdAt: string): AcademicYear {
  return { id, title: normalizeRequiredTitle(title, "اسم السنة الدراسية"), isActive: true, archived: false, createdAt };
}

export function deactivateAcademicYears(years: AcademicYear[]) {
  return years.map((year) => ({ ...year, isActive: false }));
}

export function findOrCreateTerm(terms: AcademicTerm[], yearId: string, kind: TermKind, id: string, createdAt: string): { term: AcademicTerm; isNew: boolean } {
  const existing = terms.find((term) => term.yearId === yearId && term.kind === kind);
  if (existing) return { term: existing, isNew: false };
  return {
    term: { id, yearId, kind, title: kind === "first" ? "الترم الأول" : "الترم الثاني", createdAt },
    isNew: true,
  };
}

export function allowedSections(subject: Pick<Subject, "hasPracticalSection">): SubjectSection[] {
  return subject.hasPracticalSection ? ["theory", "practical"] : ["theory"];
}

export function lectureSectionIsValid(subject: Pick<Subject, "hasPracticalSection">, section: SubjectSection) {
  return allowedSections(subject).includes(section);
}
