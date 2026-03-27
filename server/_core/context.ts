import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { supabaseAdmin } from "../lib/supabase";
import * as db from "../db";
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Verify Supabase Bearer token from Authorization header
  const authHeader = opts.req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (bearerToken && supabaseAdmin) {
    try {
      const { data: { user: supaUser }, error } = await supabaseAdmin.auth.getUser(bearerToken);
      if (supaUser && !error) {
        const dbConn = await db.getDb();
        if (dbConn) {
          const result = await dbConn.select().from(users).where(eq(users.supabaseId, supaUser.id)).limit(1);
          if (result[0]) {
            user = result[0];
          } else {
            // Auto-create user on first Supabase login
            const inserted = await dbConn.insert(users).values({
              supabaseId: supaUser.id,
              email: supaUser.email ?? null,
              name: supaUser.user_metadata?.full_name ?? supaUser.email?.split("@")[0] ?? "User",
              role: "user",
            }).returning();
            user = inserted[0] ?? null;
          }
        }
      }
    } catch (e) {
      console.error("[Auth] Supabase token verification failed:", e);
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
