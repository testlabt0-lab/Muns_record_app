import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const platform = { OS: "ios" };
  const records = new Map<string, { exists: boolean; deleted: boolean }>();
  class MockFile {
    uri: string;
    constructor(uri: string) { this.uri = uri; }
    get exists() { return records.get(this.uri)?.exists ?? false; }
    delete() { const record = records.get(this.uri); if (record) record.deleted = true; }
  }
  return { platform, records, MockFile };
});

vi.mock("react-native", () => ({ Platform: mocks.platform }));
vi.mock("expo-file-system", () => ({ File: mocks.MockFile, Directory: class {}, Paths: { document: "file:///documents" } }));

import { attachmentKindFromMime, removePersistedAttachment } from "../lib/local-attachments";

describe("المرفقات المحلية", () => {
  beforeEach(() => {
    mocks.platform.OS = "ios";
    mocks.records.clear();
  });

  it("يحذف الملف الموجود في مساحة التطبيق", () => {
    mocks.records.set("file:///documents/attachment.pdf", { exists: true, deleted: false });
    expect(removePersistedAttachment("file:///documents/attachment.pdf")).toBe(true);
    expect(mocks.records.get("file:///documents/attachment.pdf")?.deleted).toBe(true);
  });

  it("لا يفشل إذا لم يعد الملف موجوداً ولا يحذف مرفقات الويب", () => {
    expect(removePersistedAttachment("file:///documents/missing.pdf")).toBe(false);
    mocks.platform.OS = "web";
    mocks.records.set("blob:attachment", { exists: true, deleted: false });
    expect(removePersistedAttachment("blob:attachment")).toBe(false);
    expect(mocks.records.get("blob:attachment")?.deleted).toBe(false);
  });

  it("يتعرف على نوع المرفق من نوع MIME", () => {
    expect(attachmentKindFromMime("image/jpeg")).toBe("image");
    expect(attachmentKindFromMime("application/pdf")).toBe("pdf");
    expect(attachmentKindFromMime("text/plain")).toBe("document");
  });
});
