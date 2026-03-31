/**
 * Vercel Serverless Function Entry Point
 *
 * This file is bundled by esbuild into api/index.js during `build:vercel`.
 * It mirrors the route setup from server/_core/index.ts but does NOT import
 * vite.ts (which pulls in devDependencies unavailable in production).
 * Vercel's CDN serves the SPA static files — Express only handles /api/* routes.
 */
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { twilioRouter } from "./services/twilioWebhooks";
import { validateTwilioSignature } from "./middleware/twilioValidation";
import { stripeWebhookRouter } from "./stripe/stripeRoutes";
import { googleAuthRouter } from "./services/googleAuth";

const app = express();

// Trust reverse proxy headers (Vercel edge)
app.set("trust proxy", 1);

// Stripe webhook MUST be registered BEFORE express.json() for raw body signature verification
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

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
