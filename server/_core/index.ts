import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { twilioRouter } from "../services/twilioWebhooks";
import { elevenLabsWebhookRouter } from "../services/elevenLabsWebhookService";
import {
  samToolsRouter,
  samTwimlRouter,
} from "../services/samToolsRouter";
import { validateTwilioSignature } from "../middleware/twilioValidation";
import { rateLimit } from "../middleware/rateLimiter";
import { stripeWebhookRouter } from "../stripe/stripeRoutes";
import { googleAuthRouter } from "../services/googleAuth";
import { supportInboundRouter } from "../services/supportInboundRouter";

const contactLimiter = rateLimit({ name: "contact", windowSec: 60, max: 5 });
const webhookLimiter = rateLimit({ name: "webhook", windowSec: 10, max: 50 });

const app = express();

// Trust reverse proxy headers (Vercel, Cloudflare)
app.set('trust proxy', 1);

// Stripe webhook MUST be registered BEFORE express.json() for signature verification
app.use("/api/stripe", stripeWebhookRouter);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Twilio webhook routes (with signature validation + rate limiting)
app.use(
  "/api/twilio",
  webhookLimiter,
  validateTwilioSignature(),
  twilioRouter
);

// ElevenLabs post-call webhook
app.use("/api/elevenlabs", elevenLabsWebhookRouter);

// Sam tool endpoints (auth via x-sam-tool-secret)
app.use("/api/sam", samToolsRouter);
app.use("/api/sam-twiml", webhookLimiter, samTwimlRouter);

// Google OAuth integration routes
app.use("/api/integrations/google", googleAuthRouter);

// Support inbound email webhook (Resend)
app.use("/api/support", webhookLimiter, supportInboundRouter);

// Rate limit contact form submissions
app.use("/api/trpc/contact.submit", contactLimiter);

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Vercel exports the app directly — no listener needed
// For local dev, start the server with Vite middleware
if (!process.env.VERCEL) {
  const isPortAvailable = (port: number): Promise<boolean> => {
    return new Promise(resolve => {
      const server = net.createServer();
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
      server.on("error", () => resolve(false));
    });
  };

  const findAvailablePort = async (startPort: number = 3000): Promise<number> => {
    for (let port = startPort; port < startPort + 20; port++) {
      if (await isPortAvailable(port)) {
        return port;
      }
    }
    throw new Error(`No available port found starting from ${startPort}`);
  };

  const startServer = async () => {
    const server = createServer(app);

    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const preferredPort = parseInt(process.env.PORT || "3000");
    const port = await findAvailablePort(preferredPort);

    if (port !== preferredPort) {
      console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
    }

    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}/`);
    });
  };

  startServer().catch(console.error);
} else {
  // In Vercel production, serve static assets
  serveStatic(app);
}

// Export for Vercel serverless
export default app;
