import { describe, expect, it } from "vitest";

import { createSubjectFollowUpShareText } from "../lib/subject-follow-up-share";

describe("ملخص متابعة قابل للمشاركة", () => {
  it("يعرض المواد التي تحتاج متابعة دون محتوى المحاضرات", () => {
    const text = createSubjectFollowUpShareText({ filterLabel: "الترم الأول", items: [{ subject: { id: "s", termId: "t", title: "فيزياء", color: "#000", hasPracticalSection: false, theoryInstructor: "د", createdAt: "2026" }, progress: { lectureCount: 0, recordingMinutes: 0, transcribedCount: 0, summarizedCount: 0, reviewCardCount: 0, reviewedCardCount: 0, focusMinutes: 0, taskCount: 0, completedTaskCount: 0 }, percent: 0, status: "unplanned", reason: "بلا هدف" }] });
    expect(text).toContain("فيزياء: حدّد هدفاً");
    expect(text).toContain("المواد التي تحتاج متابعة: 1 من 1");
  });
});
