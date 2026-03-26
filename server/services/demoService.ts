/**
 * Demo Service
 * Seeds a realistic demo shop with sample data for product demos.
 */
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import {
  shops,
  agentConfigs,
  callLogs,
  callerProfiles,
  subscriptions,
} from "../../drizzle/schema";

export async function seedDemoShop(
  ownerId: number
): Promise<number | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  // Create demo shop
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
    serviceCatalog: [
      {
        name: "Oil Change",
        category: "Maintenance",
        price: 49,
        description: "Conventional or synthetic",
      },
      {
        name: "Brake Pad Replacement",
        category: "Brakes",
        price: 199,
        description: "Front or rear",
      },
      { name: "Tire Rotation", category: "Tires", price: 29 },
      { name: "Engine Diagnostic", category: "Diagnostics", price: 99 },
      { name: "Transmission Flush", category: "Maintenance", price: 179 },
      { name: "AC Repair", category: "Climate", price: 149 },
      { name: "Battery Replacement", category: "Electrical", price: 129 },
      { name: "Wheel Alignment", category: "Tires", price: 89 },
      { name: "Coolant Flush", category: "Maintenance", price: 99 },
      { name: "Spark Plug Replacement", category: "Engine", price: 149 },
      { name: "Serpentine Belt", category: "Engine", price: 119 },
      { name: "Fuel System Cleaning", category: "Maintenance", price: 89 },
      { name: "Headlight Restoration", category: "Body", price: 59 },
      { name: "State Inspection", category: "Inspection", price: 25 },
      { name: "Pre-Purchase Inspection", category: "Inspection", price: 149 },
    ],
  }).returning({ id: shops.id });

  const shopId = shopResult[0].id;

  // Create agent config
  await db.insert(agentConfigs).values({
    shopId,
    ownerId,
    agentName: "Alex",
    voiceId: "cjVigY5qzO86Huf0OWal",
    voiceName: "Charlie",
    greeting:
      "Thanks for calling Demo Auto Repair! This is Alex, how can I help you today?",
    systemPrompt:
      "You are Alex, the friendly AI receptionist for Demo Auto Repair. You help customers book appointments and answer questions about auto repair services.",
    upsellEnabled: true,
    confidenceThreshold: "0.80",
    maxUpsellsPerCall: 1,
    language: "en",
    elevenLabsAgentId: "demo_agent_placeholder",
  });

  // Create subscription
  await db.insert(subscriptions).values({
    shopId,
    ownerId,
    tier: "pro",
    status: "active",
    includedMinutes: 750,
    usedMinutes: 187,
    overageRate: "0.1500",
    billingCycle: "monthly",
    currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
  });

  // Seed sample call logs (20 calls over 30 days)
  const statuses = [
    "completed",
    "completed",
    "completed",
    "completed",
    "missed",
  ] as const;
  const services = [
    "Oil Change",
    "Brake Pad Replacement",
    "Engine Diagnostic",
    "Tire Rotation",
    "AC Repair",
    "Battery Replacement",
  ];
  const names = [
    "John Smith",
    "Maria Garcia",
    "Robert Johnson",
    "Sarah Williams",
    "James Brown",
    "Jennifer Davis",
    "Michael Wilson",
    "Emily Martinez",
  ];

  for (let i = 0; i < 20; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const service = services[Math.floor(Math.random() * services.length)];
    const name = names[Math.floor(Math.random() * names.length)];
    const duration =
      status === "completed" ? 60 + Math.floor(Math.random() * 300) : 0;
    const booked = status === "completed" && Math.random() > 0.4;
    const upsellAttempted = booked && Math.random() > 0.5;
    const upsellAccepted = upsellAttempted && Math.random() > 0.6;
    const revenue = booked ? 50 + Math.floor(Math.random() * 400) : 0;

    await db.insert(callLogs).values({
      shopId,
      ownerId,
      twilioCallSid: `demo_${shopId}_${i}`,
      callerPhone: `+1555${String(1000000 + Math.floor(Math.random() * 9000000)).slice(0, 7)}`,
      callerName: name,
      direction: "inbound",
      status,
      duration,
      summary:
        status === "completed"
          ? `${name} called about ${service.toLowerCase()}. ${booked ? "Appointment booked." : "Took a message."}`
          : undefined,
      customerIntent: service.toLowerCase().replace(/ /g, "_"),
      serviceRequested: service,
      appointmentBooked: booked,
      upsellAttempted,
      upsellAccepted,
      sentimentScore: (0.5 + Math.random() * 0.5).toFixed(2),
      qualityScore: (0.6 + Math.random() * 0.4).toFixed(2),
      estimatedRevenue: revenue.toFixed(2),
      callStartedAt: date,
      callEndedAt: new Date(date.getTime() + duration * 1000),
      createdAt: date,
    });
  }

  // Seed caller profiles
  for (let i = 0; i < 5; i++) {
    const name = names[i];
    await db
      .insert(callerProfiles)
      .values({
        phone: `+1555${String(1000000 + i * 1111111).slice(0, 7)}`,
        name,
        callerRole: "prospect",
        callCount: 1 + Math.floor(Math.random() * 5),
        lastCalledAt: new Date(
          Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000
        ),
      })
      .onConflictDoUpdate({ target: callerProfiles.phone, set: { callCount: 1 } });
  }

  return shopId;
}

export async function isDemoShop(shopId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select({ name: shops.name })
    .from(shops)
    .where(eq(shops.id, shopId))
    .limit(1);
  return result[0]?.name === "Demo Auto Repair";
}
