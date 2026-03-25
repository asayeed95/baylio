/**
 * Demo Data Seeder
 *
 * Seeds a demo shop with realistic data so the dashboard looks populated.
 * Run: DATABASE_URL=<url> node server/scripts/seed-demo.mjs <ownerId>
 *
 * Creates:
 * - 1 demo shop with full service catalog and business hours
 * - 1 agent config (configured, provisioned)
 * - 1 active subscription (Pro tier)
 * - 10 sample call logs (7 completed, 2 missed, 1 voicemail)
 * - 5 sample caller profiles
 */

import { drizzle } from "drizzle-orm/mysql2";
import {
  shops,
  agentConfigs,
  callLogs,
  callerProfiles,
  subscriptions,
} from "../../drizzle/schema.js";

const DATABASE_URL = process.env.DATABASE_URL;
const ownerId = parseInt(process.argv[2] || "1");

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required. Usage: DATABASE_URL=<url> node server/scripts/seed-demo.mjs <ownerId>");
  process.exit(1);
}

const db = drizzle(DATABASE_URL);

const SERVICES = [
  { name: "Oil Change", category: "Maintenance", price: 49, description: "Conventional or synthetic" },
  { name: "Brake Pad Replacement", category: "Brakes", price: 199, description: "Front or rear" },
  { name: "Tire Rotation", category: "Tires", price: 29 },
  { name: "Engine Diagnostic", category: "Diagnostics", price: 99 },
  { name: "Transmission Flush", category: "Maintenance", price: 179 },
  { name: "AC Repair", category: "Climate", price: 149 },
  { name: "Battery Replacement", category: "Electrical", price: 129 },
  { name: "Wheel Alignment", category: "Tires", price: 89 },
  { name: "Coolant Flush", category: "Maintenance", price: 99 },
  { name: "State Inspection", category: "Inspection", price: 25 },
];

const CALLERS = [
  { name: "John Smith", phone: "+15551001001" },
  { name: "Maria Garcia", phone: "+15551001002" },
  { name: "Robert Johnson", phone: "+15551001003" },
  { name: "Sarah Williams", phone: "+15551001004" },
  { name: "James Brown", phone: "+15551001005" },
];

console.log(`Seeding demo data for ownerId=${ownerId}...`);

// 1. Create shop
const shopResult = await db.insert(shops).values({
  ownerId,
  name: "Demo Auto Repair",
  phone: "(555) 000-DEMO",
  address: "123 Demo Street",
  city: "Austin",
  state: "TX",
  zip: "78701",
  timezone: "America/Chicago",
  isActive: true,
  smsFollowUpEnabled: true,
  businessHours: {
    monday: { open: "08:00", close: "18:00", closed: false },
    tuesday: { open: "08:00", close: "18:00", closed: false },
    wednesday: { open: "08:00", close: "18:00", closed: false },
    thursday: { open: "08:00", close: "18:00", closed: false },
    friday: { open: "08:00", close: "18:00", closed: false },
    saturday: { open: "09:00", close: "14:00", closed: false },
    sunday: { open: "00:00", close: "00:00", closed: true },
  },
  serviceCatalog: SERVICES,
});
const shopId = shopResult[0].insertId;
console.log(`  Shop created: id=${shopId}`);

// 2. Agent config
await db.insert(agentConfigs).values({
  shopId,
  ownerId,
  agentName: "Alex",
  voiceId: "cjVigY5qzO86Huf0OWal",
  voiceName: "Charlie",
  greeting: "Thanks for calling Demo Auto Repair! This is Alex, how can I help you today?",
  systemPrompt: "You are Alex, the AI receptionist for Demo Auto Repair.",
  upsellEnabled: true,
  confidenceThreshold: "0.80",
  maxUpsellsPerCall: 1,
  language: "en",
  elevenLabsAgentId: "demo_agent_placeholder",
});
console.log("  Agent config created");

// 3. Subscription
const now = new Date();
await db.insert(subscriptions).values({
  shopId,
  ownerId,
  tier: "pro",
  status: "active",
  includedMinutes: 750,
  usedMinutes: 187,
  overageRate: "0.1500",
  billingCycle: "monthly",
  currentPeriodStart: new Date(now.getTime() - 15 * 86400000),
  currentPeriodEnd: new Date(now.getTime() + 15 * 86400000),
});
console.log("  Subscription created (Pro)");

// 4. Call logs (10 calls over 30 days)
const statuses = ["completed", "completed", "completed", "completed", "completed", "completed", "completed", "missed", "missed", "voicemail"];
for (let i = 0; i < 10; i++) {
  const daysAgo = Math.floor(Math.random() * 30);
  const date = new Date(now.getTime() - daysAgo * 86400000);
  const status = statuses[i];
  const caller = CALLERS[i % CALLERS.length];
  const service = SERVICES[Math.floor(Math.random() * SERVICES.length)];
  const duration = status === "completed" ? 60 + Math.floor(Math.random() * 300) : status === "voicemail" ? 15 + Math.floor(Math.random() * 30) : 0;
  const booked = status === "completed" && Math.random() > 0.3;
  const revenue = booked ? service.price || 100 : 0;

  await db.insert(callLogs).values({
    shopId,
    ownerId,
    twilioCallSid: `demo_${shopId}_${i}_${Date.now()}`,
    callerPhone: caller.phone,
    callerName: caller.name,
    direction: "inbound",
    status,
    duration,
    summary: status === "completed"
      ? `${caller.name} called about ${service.name.toLowerCase()}. ${booked ? "Appointment booked." : "Took a message."}`
      : status === "voicemail"
        ? `Voicemail from ${caller.name}.`
        : undefined,
    customerIntent: service.name.toLowerCase().replace(/ /g, "_"),
    serviceRequested: service.name,
    appointmentBooked: booked,
    upsellAttempted: booked && Math.random() > 0.5,
    upsellAccepted: false,
    sentimentScore: (0.5 + Math.random() * 0.5).toFixed(2),
    qualityScore: (0.6 + Math.random() * 0.4).toFixed(2),
    estimatedRevenue: revenue.toFixed(2),
    callStartedAt: date,
    callEndedAt: new Date(date.getTime() + duration * 1000),
    createdAt: date,
  });
}
console.log("  10 call logs created");

// 5. Caller profiles
for (const caller of CALLERS) {
  await db.insert(callerProfiles).values({
    phone: caller.phone,
    name: caller.name,
    callerRole: "prospect",
    callCount: 1 + Math.floor(Math.random() * 5),
    lastCalledAt: new Date(now.getTime() - Math.floor(Math.random() * 7) * 86400000),
  }).onDuplicateKeyUpdate({ set: { callCount: 1 } });
}
console.log("  5 caller profiles created");

console.log(`\nDone! Demo shop "${shopId}" is ready. Visit /shops/${shopId} to see the data.`);
process.exit(0);
