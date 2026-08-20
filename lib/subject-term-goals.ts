import type { SubjectTermGoal } from "./study-types";

export type SubjectTermGoalTargets = Pick<SubjectTermGoal, "lectureTarget" | "reviewTarget" | "focusMinutesTarget">;

/** يتحقق من أهداف المادة كي تبقى مؤشرات الترم قابلة للحساب وآمنة للحفظ محلياً. */
export function normalizeSubjectTermGoalTargets(input: SubjectTermGoalTargets): SubjectTermGoalTargets {
  const targets = { lectureTarget: Number(input.lectureTarget), reviewTarget: Number(input.reviewTarget), focusMinutesTarget: Number(input.focusMinutesTarget) };
  const valid = Object.values(targets).every((value) => Number.isInteger(value) && value >= 0 && value <= 10000);
  if (!valid || (!targets.lectureTarget && !targets.reviewTarget && !targets.focusMinutesTarget)) throw new Error("حدد هدفاً واحداً صحيحاً على الأقل.");
  return targets;
}
