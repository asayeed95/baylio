import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { twilioRouter } from "../services/twilioWebhooks";
import { validateTwilioSignature } from "../middleware/twilioValidation";
import { stripeWebhookRouter } from "../stripe/stripeRoutes";
import { googleAuthRouter } from "../services/googleAuth";

const app = express();

// Trust reverse proxy headers (Vercel, Cloudflare)
app.set('trust proxy', 1);

// Stripe webhook MUST be registered BEFORE express.json() for signature verification
app.use("/api/stripe", stripeWebhookRouter);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Twilio webhook routes (with signature validation middleware)
app.use(
  "/api/twilio",
  validateTwilioSignature({ logOnly: true }),
  twilioRouter
);

// Google OAuth integration routes
app.use("/api/integrations/google", googleAuthRouter);

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
