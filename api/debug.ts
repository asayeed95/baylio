import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const errors: string[] = [];

  try { await import("../server/_core/context"); } catch (e: any) { errors.push(`context: ${e.message}`); }
  try { await import("../server/_core/trpc"); } catch (e: any) { errors.push(`trpc: ${e.message}`); }
  try { await import("../server/routers"); } catch (e: any) { errors.push(`routers: ${e.message}`); }
  try { await import("../server/services/twilioWebhooks"); } catch (e: any) { errors.push(`twilioWebhooks: ${e.message}`); }
  try { await import("../server/middleware/twilioValidation"); } catch (e: any) { errors.push(`twilioValidation: ${e.message}`); }
  try { await import("../server/stripe/stripeRoutes"); } catch (e: any) { errors.push(`stripeRoutes: ${e.message}`); }
  try { await import("../server/services/googleAuth"); } catch (e: any) { errors.push(`googleAuth: ${e.message}`); }

  res.json({
    status: errors.length === 0 ? "all_imports_ok" : "import_errors",
    errors,
  });
}
