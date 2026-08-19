import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM, listLLMModels } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
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
      .input(z.object({ transcript: z.string().min(40).max(60000), language: z.enum(["ar", "en"]).default("ar") }))
      .mutation(async ({ input }) => {
        const models = await listLLMModels();
        const model = models.data.find((candidate) => candidate.id === "gpt-5-mini")?.id;
        const response = await invokeLLM({
          model,
          messages: [
            {
              role: "system",
              content: "أنت مساعد أكاديمي دقيق. حلل نص محاضرة من دون اختراع معلومات. أعد JSON فقط بالمفاتيح overview وkeyPoints وterms وreviewQuestions. اكتب بالعربية الفصحى الواضحة، واجعل الأسئلة مناسبة للمراجعة الذاتية.",
            },
            { role: "user", content: `لغة المحاضرة: ${input.language}\n\nنص المحاضرة:\n${input.transcript}` },
          ],
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

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
