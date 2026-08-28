import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM, listLLMModels } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { isAudioBackupEncryptionConfigured } from "./audio-backup-crypto";
import { decryptAudioBackup, encryptAudioBackup } from "./audio-backup-crypto";
import { storageGetSignedUrl, storagePut } from "./storage";
import { MAX_ATTACHMENT_EXTRACTION_BYTES, isImageExtractionSupported } from "../lib/attachment-extraction";
import { getSummaryStyleInstruction } from "../shared/summary-style";
import { z } from "zod";

const rawLectureSummarySchema = z.object({
  overview: z.string().min(1),
  keyPoints: z.array(z.string()).min(2).max(8),
  terms: z.array(z.union([
    z.string(),
    z.object({ term: z.string().min(1), definition: z.string().min(1).optional() }),
  ])).max(12),
  reviewQuestions: z.array(z.string()).min(2).max(6),
});

function normalizeLectureSummary(value: unknown) {
  const summary = rawLectureSummarySchema.parse(value);
  return {
    ...summary,
    terms: summary.terms.map((term) => {
      if (typeof term === "string") return term;
      return term.definition ? `${term.term}: ${term.definition}` : term.term;
    }),
  };
}

const attachmentExtractionSchema = z.object({
  text: z.string().min(1).max(30_000),
  keyPoints: z.array(z.string().min(1).max(500)).max(8),
  reviewCards: z.array(z.object({ question: z.string().min(3).max(500), answer: z.string().min(1).max(1_000) })).max(5),
});

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  lectures: router({
    summarize: publicProcedure
      .input(z.object({ transcript: z.string().min(40).max(60000), language: z.enum(["ar", "en"]).default("ar"), style: z.enum(["quick", "exam", "outline"]).default("quick") }))
      .mutation(async ({ input }) => {
        const models = await listLLMModels();
        const model = models.data.find((candidate) => candidate.id === "gpt-5-mini")?.id;
        const response = await invokeLLM({
          model,
          messages: [
            {
              role: "system",
              content: `أنت مساعد أكاديمي دقيق. حلل نص محاضرة من دون اختراع معلومات. أعد JSON فقط بالمفاتيح overview وkeyPoints وterms وreviewQuestions. اكتب بالعربية الفصحى الواضحة، واجعل الأسئلة مناسبة للمراجعة الذاتية. ${getSummaryStyleInstruction(input.style)}`,
            },
            { role: "user", content: `لغة المحاضرة: ${input.language}\n\nنص المحاضرة:\n${input.transcript}` },
          ],
          response_format: { type: "json_schema", json_schema: { name: "lecture_summary", strict: true, schema: { type: "object", properties: { overview: { type: "string" }, keyPoints: { type: "array", items: { type: "string" } }, terms: { type: "array", items: { type: "string" } }, reviewQuestions: { type: "array", items: { type: "string" } } }, required: ["overview", "keyPoints", "terms", "reviewQuestions"], additionalProperties: false } } },
        });
        const content = response.choices[0]?.message?.content;
        if (!content || typeof content !== "string") throw new Error("لم تُرجع خدمة التلخيص محتوى صالحاً.");
        try {
          return normalizeLectureSummary(JSON.parse(content));
        } catch {
          throw new Error("تعذر التحقق من بنية الملخص الناتج.");
        }
      }),
  }),
  attachments: router({
    extractImageText: publicProcedure
      .input(z.object({ fileName: z.string().min(1).max(255), mimeType: z.string().min(1).max(64), dataBase64: z.string().min(4).max(8_400_000) }))
      .mutation(async ({ input }) => {
        if (!isImageExtractionSupported(input.mimeType)) throw new Error("استخراج النص متاح لصور JPG وPNG وWebP فقط.");
        const raw = Buffer.from(input.dataBase64, "base64");
        if (!raw.length || raw.length > MAX_ATTACHMENT_EXTRACTION_BYTES) throw new Error("حجم الصورة غير صالح لاستخراج النص. الحد الأقصى هو 6 ميغابايت.");
        const models = await listLLMModels();
        const model = models.data.find((candidate) => candidate.id === "gemini-3-flash-preview")?.id ?? models.data.find((candidate) => candidate.id === "gpt-5-mini")?.id;
        const response = await invokeLLM({
          model,
          messages: [
            { role: "system", content: "أنت نظام استخراج معرفي دقيق من صور تعليمية. انسخ النص الظاهر فقط ولا تخمّن الكلمات غير المقروءة. أعد JSON فقط بالمفاتيح text وkeyPoints وreviewCards. اكتب النص بالعربية كما يظهر أو بلغته الأصلية، واجعل keyPoints قائمة قصيرة بالحقائق الواضحة في الصورة. أنشئ حتى خمس بطاقات سؤال وجواب للمراجعة الذاتية من معلومات ظاهرة بوضوح فقط؛ لا تخترع حقائق ولا تضف بطاقة إذا كانت الصورة لا تكفي." },
            { role: "user", content: [{ type: "text", text: `استخرج المحتوى من المرفق «${input.fileName}».` }, { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${input.dataBase64}`, detail: "high" } }] },
          ],
          response_format: { type: "json_schema", json_schema: { name: "attachment_extraction", strict: true, schema: { type: "object", properties: { text: { type: "string" }, keyPoints: { type: "array", items: { type: "string" } }, reviewCards: { type: "array", items: { type: "object", properties: { question: { type: "string" }, answer: { type: "string" } }, required: ["question", "answer"], additionalProperties: false } } }, required: ["text", "keyPoints", "reviewCards"], additionalProperties: false } } },
        });
        const content = response.choices[0]?.message?.content;
        if (!content || typeof content !== "string") throw new Error("لم تُرجع خدمة الاستخراج محتوى صالحاً.");
        try { return attachmentExtractionSchema.parse(JSON.parse(content)); } catch { throw new Error("تعذر التحقق من النص المستخرج من الصورة."); }
      }),
  }),
  studySync: router({
    save: protectedProcedure
      .input(z.object({ payload: z.string().min(2).max(8_000_000) }))
      .mutation(async ({ ctx, input }) => {
        await db.saveStudyBackup(ctx.user.id, input.payload);
        return { savedAt: new Date().toISOString() };
      }),
    load: protectedProcedure.query(async ({ ctx }) => {
      const backup = await db.getStudyBackup(ctx.user.id);
      return backup ? { payload: backup.payload, updatedAt: backup.updatedAt.toISOString() } : null;
    }),
  }),
  backupCrypto: router({
    health: publicProcedure.query(() => ({ configured: isAudioBackupEncryptionConfigured() })),
  }),
  encryptedMedia: router({
    upload: protectedProcedure.input(z.object({ lectureId: z.string().min(1).max(160), sourceId: z.string().max(160).optional(), fileName: z.string().min(1).max(255), contentType: z.string().min(1).max(128), dataBase64: z.string().min(4).max(22_500_000) })).mutation(async ({ ctx, input }) => {
      const raw = Buffer.from(input.dataBase64, "base64");
      if (!raw.length || raw.length > 16 * 1024 * 1024) throw new Error("حجم الملف غير صالح للنسخ المشفر.");
      const encrypted = encryptAudioBackup(raw);
      const { key } = await storagePut(`encrypted-study-backups/${ctx.user.id}/${Date.now()}.bin`, encrypted.encrypted, "application/octet-stream");
      const id = await db.saveEncryptedMediaBackup({ userId: ctx.user.id, lectureId: input.lectureId, sourceId: input.sourceId, fileName: input.fileName, contentType: input.contentType, storageKey: key, ivLength: encrypted.ivLength, tagLength: encrypted.tagLength, originalSize: raw.length });
      return { id };
    }),
    list: protectedProcedure.query(({ ctx }) => db.listEncryptedMediaBackups(ctx.user.id)),
    restore: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const record = await db.getEncryptedMediaBackup(ctx.user.id, input.id);
      if (!record) throw new Error("لم نعثر على هذا الملف في نسختك الاحتياطية.");
      const response = await fetch(await storageGetSignedUrl(record.storageKey));
      if (!response.ok) throw new Error("تعذر جلب الملف المشفر من التخزين.");
      const decrypted = decryptAudioBackup(Buffer.from(await response.arrayBuffer()), record.ivLength, record.tagLength);
      return { fileName: record.fileName, contentType: record.contentType, dataBase64: decrypted.toString("base64"), lectureId: record.lectureId, sourceId: record.sourceId, originalSize: record.originalSize };
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const removed = await db.deleteEncryptedMediaBackup(ctx.user.id, input.id);
      if (!removed) throw new Error("لم نعثر على هذه النسخة المشفرة أو لا تملك صلاحية حذفها.");
      return { id: removed.id, fileName: removed.fileName };
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
