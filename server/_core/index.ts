import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { storagePut } from "../storage";
import { transcribeAudio } from "./voiceTranscription";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.post("/api/lectures/transcribe", express.raw({ type: "audio/*", limit: "16mb" }), async (req, res) => {
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        res.status(400).json({ error: "لم يتم إرسال ملف صوتي صالح." });
        return;
      }
      const contentType = req.headers["content-type"] || "audio/m4a";
      const { url } = await storagePut(`lecture-audio/${Date.now()}.m4a`, req.body, contentType);
      const forwardedProtocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
      const baseUrl = `${forwardedProtocol || req.protocol}://${req.get("host")}`;
      const result = await transcribeAudio({
        audioUrl: `${baseUrl}${url}`,
        language: "ar",
        prompt: "هذه محاضرة جامعية باللغة العربية. اكتب النص بدقة، مع الحفاظ على المصطلحات العلمية.",
      });
      if (!("text" in result) || !result.text) {
        res.status(502).json({ error: "لم تُرجع خدمة التحويل نصاً صالحاً." });
        return;
      }
      res.json({
        text: result.text,
        language: result.language,
        segments: result.segments.map((segment) => ({
          id: String(segment.id),
          text: segment.text.trim(),
          startSeconds: segment.start,
          endSeconds: segment.end,
        })).filter((segment) => segment.text.length > 0),
      });
    } catch (error) {
      console.error("[lectures.transcribe] failed", error);
      res.status(500).json({ error: "تعذر تحويل التسجيل إلى نص في الوقت الحالي." });
    }
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
