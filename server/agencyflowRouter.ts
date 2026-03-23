/**
 * AgencyFlow → Baylio Lead Intelligence API
 *
 * Authenticated REST endpoints that AgencyFlow's autonomous agents use to:
 *   1. Push cold lead batches (auto repair shops discovered via scraping)
 *   2. Pull back conversion status (who signed up, who churned)
 *
 * Authentication: Bearer token via AGENCYFLOW_API_KEY env var.
 * MCP-compatible: wrap these endpoints as MCP tools in AgencyFlow's server.
 */
import { Router, Request, Response } from "express";
import { getDb } from "./db";
import { prospects, prospectNotes } from "../drizzle/schema";
import { eq, desc, and, or, like, SQL } from "drizzle-orm";
import { createOrUpdateContact } from "./services/hubspotService";

const agencyflowRouter = Router();

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function requireAgencyFlowKey(req: Request, res: Response, next: () => void): void {
  const apiKey = process.env.AGENCYFLOW_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "AGENCYFLOW_API_KEY not configured on server" });
    return;
  }
  const authHeader = req.headers.authorization;
  const provided = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!provided || provided !== apiKey) {
    res.status(401).json({ error: "Unauthorized: invalid or missing API key" });
    return;
  }
  next();
}

agencyflowRouter.use(requireAgencyFlowKey);

// ─── POST /api/agencyflow/leads ───────────────────────────────────────────────
// AgencyFlow pushes cold lead batches here.
// Upserts by phone number (if provided) or shop name + city combo.
// Automatically syncs each new lead to HubSpot as lifecycle "lead".
agencyflowRouter.post("/leads", async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) return res.status(503).json({ error: "Database unavailable" });

  const body = req.body as { leads?: unknown[] };
  if (!Array.isArray(body.leads) || body.leads.length === 0) {
    return res.status(400).json({ error: "Request body must include a non-empty 'leads' array" });
  }
  if (body.leads.length > 500) {
    return res.status(400).json({ error: "Maximum 500 leads per batch" });
  }

  type LeadInput = {
    ownerName?: string;
    shopName?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    website?: string;
    googlePlaceId?: string;
    estimatedMonthlyRevenue?: string;
    numTechnicians?: number;
    notes?: string;
    source?: string;
  };

  const results = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const raw of body.leads as LeadInput[]) {
    try {
      if (!raw.shopName) {
        results.skipped++;
        results.errors.push(`Skipped: missing shopName`);
        continue;
      }
      if (!raw.ownerName) raw.ownerName = "Unknown Owner";

      // Check for existing prospect by phone or (shopName + city)
      let existing = null;
      if (raw.phone) {
        const rows = await db.select().from(prospects).where(eq(prospects.phone, raw.phone)).limit(1);
        existing = rows[0] ?? null;
      }
      if (!existing && raw.shopName && raw.city) {
        const rows = await db.select().from(prospects)
          .where(and(eq(prospects.shopName, raw.shopName), eq(prospects.city, raw.city)))
          .limit(1);
        existing = rows[0] ?? null;
      }

      const sourceValue = (["manual", "csv_import", "google_maps", "yelp", "referral", "cold_call"].includes(raw.source ?? ""))
        ? (raw.source as "manual" | "csv_import" | "google_maps" | "yelp" | "referral" | "cold_call")
        : "manual";

      if (existing) {
        // Update with any new data that was missing
        await db.update(prospects).set({
          ownerName: raw.ownerName ?? existing.ownerName,
          email: raw.email ?? existing.email,
          address: raw.address ?? existing.address,
          city: raw.city ?? existing.city,
          state: raw.state ?? existing.state,
          zip: raw.zip ?? existing.zip,
          website: raw.website ?? existing.website,
          googlePlaceId: raw.googlePlaceId ?? existing.googlePlaceId,
          estimatedMonthlyRevenue: raw.estimatedMonthlyRevenue ?? existing.estimatedMonthlyRevenue,
          numTechnicians: raw.numTechnicians ?? existing.numTechnicians,
          updatedAt: new Date(),
        }).where(eq(prospects.id, existing.id));
        results.updated++;
      } else {
        // Insert new prospect
        await db.insert(prospects).values({
          ownerName: raw.ownerName,
          shopName: raw.shopName,
          phone: raw.phone,
          email: raw.email,
          address: raw.address,
          city: raw.city,
          state: raw.state,
          zip: raw.zip,
          website: raw.website,
          googlePlaceId: raw.googlePlaceId,
          estimatedMonthlyRevenue: raw.estimatedMonthlyRevenue,
          numTechnicians: raw.numTechnicians,
          source: sourceValue,
          outreachStatus: "not_contacted",
          notes: raw.notes,
        });
        results.inserted++;

        // Sync to HubSpot as cold lead
        if (raw.email || raw.phone) {
          try {
            await createOrUpdateContact(
              raw.email ?? `noemail+${Date.now()}@placeholder.baylio.io`,
              {
                firstname: raw.ownerName.split(" ")[0] ?? raw.ownerName,
                lastname: raw.ownerName.split(" ").slice(1).join(" ") || undefined,
                phone: raw.phone,
                company: raw.shopName,
                lifecyclestage: "lead",
                hs_lead_status: "baylio_cold_lead",
              }
            );
          } catch {
            // HubSpot sync failure is non-blocking
          }
        }
      }
    } catch (err) {
      results.skipped++;
      results.errors.push(`Error processing lead: ${(err as Error).message}`);
    }
  }

  return res.json({
    success: true,
    summary: results,
    message: `Processed ${body.leads.length} leads: ${results.inserted} inserted, ${results.updated} updated, ${results.skipped} skipped`,
  });
});

// ─── GET /api/agencyflow/leads ────────────────────────────────────────────────
// AgencyFlow pulls back the full prospect list with conversion status.
// Useful for AgencyFlow to know which shops converted and skip re-contacting them.
agencyflowRouter.get("/leads", async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) return res.status(503).json({ error: "Database unavailable" });

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(200, parseInt(req.query.limit as string) || 50);
  const offset = (page - 1) * limit;
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  type OutreachStatus = "not_contacted" | "called" | "voicemail" | "interested" | "demo_scheduled" | "signed_up" | "not_interested" | "do_not_call";
  const validStatuses: OutreachStatus[] = ["not_contacted", "called", "voicemail", "interested", "demo_scheduled", "signed_up", "not_interested", "do_not_call"];

  const conditions = [];
  if (status && validStatuses.includes(status as OutreachStatus)) {
    conditions.push(eq(prospects.outreachStatus, status as OutreachStatus));
  }
  if (search) {
    conditions.push(
      (or(
        like(prospects.shopName, `%${search}%`),
        like(prospects.ownerName, `%${search}%`),
        like(prospects.city, `%${search}%`)
      ) as SQL)
    );
  }

  const rows = await db.select().from(prospects)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(prospects.createdAt))
    .limit(limit)
    .offset(offset);

  return res.json({
    leads: rows,
    page,
    limit,
    hasMore: rows.length === limit,
  });
});

// ─── PATCH /api/agencyflow/leads/:id/status ───────────────────────────────────
// AgencyFlow updates outreach status after attempting contact.
agencyflowRouter.patch("/leads/:id/status", async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) return res.status(503).json({ error: "Database unavailable" });

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid lead ID" });

  type OutreachStatus = "not_contacted" | "called" | "voicemail" | "interested" | "demo_scheduled" | "signed_up" | "not_interested" | "do_not_call";
  const validStatuses: OutreachStatus[] = ["not_contacted", "called", "voicemail", "interested", "demo_scheduled", "signed_up", "not_interested", "do_not_call"];
  const { status, note, agentName } = req.body as { status?: string; note?: string; agentName?: string };

  if (!status || !validStatuses.includes(status as OutreachStatus)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });
  }

  await db.update(prospects).set({
    outreachStatus: status as OutreachStatus,
    lastContactedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(prospects.id, id));

  // Log the status change as a prospect note
  if (note) {
    type CreatedBy = "human" | "alex" | "sam" | "system";
    const validAgents: CreatedBy[] = ["human", "alex", "sam", "system"];
    const createdBy: CreatedBy = validAgents.includes(agentName as CreatedBy) ? (agentName as CreatedBy) : "system";
    await db.insert(prospectNotes).values({
      prospectId: id,
      note,
      createdBy,
    });
  }

  return res.json({ success: true, id, status });
});

// ─── GET /api/agencyflow/stats ────────────────────────────────────────────────
// AgencyFlow dashboard — quick stats on lead pipeline health.
agencyflowRouter.get("/stats", async (_req: Request, res: Response) => {
  const db = await getDb();
  if (!db) return res.status(503).json({ error: "Database unavailable" });

  const allProspects = await db.select({
    outreachStatus: prospects.outreachStatus,
  }).from(prospects);

  const stats = allProspects.reduce((acc, p) => {
    acc[p.outreachStatus] = (acc[p.outreachStatus] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = allProspects.length;
  const converted = stats["signed_up"] ?? 0;
  const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : "0.0";

  return res.json({
    total,
    conversionRate: `${conversionRate}%`,
    byStatus: stats,
  });
});

export { agencyflowRouter };
