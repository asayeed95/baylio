#!/usr/bin/env node
/**
 * Temporarily swap Abdur's shop (shop ID 1) to a minimal test agent.
 * Run with: node --env-file=.env.test scripts/swap-agent-test.mjs
 *
 * Usage:
 *   node --env-file=.env.test scripts/swap-agent-test.mjs use-test
 *   node --env-file=.env.test scripts/swap-agent-test.mjs restore
 */
import postgres from "postgres";

const TEST_AGENT_ID = "agent_5601knrcgwpafpfr8946b0hj08c4"; // GPT-4o-mini, minimal config
const ZEE_AGENT_ID  = "agent_0601knpttvyyebcv6cnnkrhv1sh1"; // Zee (Abdur's shop)
const SHOP_ID = 1;

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const sql = postgres(url, { prepare: false, max: 1 });
const cmd = process.argv[2];

try {
  if (cmd === "use-test") {
    await sql`UPDATE agent_configs SET "elevenLabsAgentId" = ${TEST_AGENT_ID} WHERE "shopId" = ${SHOP_ID}`;
    console.log(`Shop ${SHOP_ID} → TEST agent (${TEST_AGENT_ID})`);
  } else if (cmd === "restore") {
    await sql`UPDATE agent_configs SET "elevenLabsAgentId" = ${ZEE_AGENT_ID} WHERE "shopId" = ${SHOP_ID}`;
    console.log(`Shop ${SHOP_ID} → Zee (${ZEE_AGENT_ID})`);
  } else {
    const rows = await sql`SELECT "elevenLabsAgentId" FROM agent_configs WHERE "shopId" = ${SHOP_ID}`;
    console.log("Current agent:", rows[0]?.elevenLabsAgentId);
  }
} finally {
  await sql.end();
}
