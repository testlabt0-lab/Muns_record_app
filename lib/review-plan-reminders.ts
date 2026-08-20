/** يحوّل أرقام أيام JavaScript (الأحد=0) إلى قائمة أسبوعية فريدة وصالحة. */
export function normalizeWeeklyReviewDays(days: number[]) {
  return Array.from(new Set(days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))).sort((a, b) => a - b);
}
