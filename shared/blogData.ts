/**
 * Blog Data Layer
 * 
 * Static blog posts for Baylio's content marketing.
 * Each post is SEO-optimized for auto repair shop owners
 * searching for AI call answering, missed call solutions,
 * and shop automation.
 */

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  authorRole: string;
  publishedAt: string;       // ISO date string
  readTimeMinutes: number;
  category: BlogCategory;
  tags: string[];
  metaTitle: string;         // SEO title (max 60 chars)
  metaDescription: string;   // SEO description (max 155 chars)
  featuredImage?: string;    // CDN URL
  featured: boolean;
}

export type BlogCategory = 
  | "industry-insights"
  | "product-updates"
  | "guides"
  | "case-studies"
  | "ai-technology";

export const CATEGORY_LABELS: Record<BlogCategory, string> = {
  "industry-insights": "Industry Insights",
  "product-updates": "Product Updates",
  "guides": "Guides & How-To",
  "case-studies": "Case Studies",
  "ai-technology": "AI Technology",
};

export const CATEGORY_COLORS: Record<BlogCategory, string> = {
  "industry-insights": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "product-updates": "bg-primary/10 text-primary",
  "guides": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "case-studies": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "ai-technology": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
};

export const blogPosts: BlogPost[] = [
  {
    slug: "why-auto-repair-shops-miss-calls",
    title: "Why Auto Repair Shops Miss 30% of Their Calls — And What It Costs Them",
    excerpt: "The average auto repair shop misses nearly a third of incoming calls. Each missed call represents $200–$800 in lost revenue. Here's why it happens and how to fix it without hiring more staff.",
    content: `
## The Hidden Revenue Leak

Every auto repair shop owner knows the feeling: you're elbow-deep in a brake job, the phone rings, and by the time you get to it — they've already called your competitor down the street.

According to industry data, the average auto repair shop misses **28–35% of incoming calls** during business hours. After hours? That number jumps to 100% for shops without an answering service.

## The Math That Should Keep You Up at Night

Let's break down what those missed calls actually cost:

- **Average repair order value:** $350–$800
- **Calls per day for a typical shop:** 15–25
- **Missed calls per day (at 30%):** 5–8
- **Conversion rate of answered calls:** 60–70%

That means every missed call is worth roughly **$210–$560 in potential revenue**. Over a month, a shop missing just 5 calls per day is leaving **$22,000–$58,000 on the table**.

## Why It Happens

The reasons are always the same:

1. **Technicians are busy.** Your best people are working on cars, not answering phones.
2. **Lunch hours and breaks.** Nobody's at the front desk from 12–1 PM — prime calling time.
3. **After-hours calls.** Customers don't only need repairs between 8 AM and 5 PM.
4. **Hold times.** When you do answer, putting someone on hold while you look up parts or check the schedule means they hang up.
5. **Multiple calls at once.** One line, three callers — two of them go to voicemail.

## The Old Solutions Don't Work

**Hiring a receptionist** costs $35,000–$45,000/year plus benefits. They still can't answer after hours, and they call in sick.

**Answering services** cost $200–$500/month but can't book appointments, don't know your service menu, and sound generic.

**Voicemail** is where customers go to never call back. Studies show 80% of callers who reach voicemail will not leave a message — they'll call the next shop on Google.

## The AI Alternative

Modern AI voice agents can answer every call in under 2 seconds, 24/7. They know your services, your hours, your pricing. They can book appointments directly into your calendar, send confirmation texts, and hand off complex questions to your team.

The cost? A fraction of a receptionist's salary, with zero sick days and infinite patience.

**The shops that answer every call win.** It's that simple.
    `,
    author: "Abdur Rahman",
    authorRole: "Founder, Baylio",
    publishedAt: "2026-03-20",
    readTimeMinutes: 5,
    category: "industry-insights",
    tags: ["missed calls", "revenue loss", "auto repair", "phone answering"],
    metaTitle: "Why Auto Repair Shops Miss 30% of Calls | Baylio",
    metaDescription: "Auto repair shops miss 30% of calls, losing $22K–$58K/month. Learn why it happens and how AI call assistants fix it.",
    featured: true,
  },
  {
    slug: "ai-receptionist-vs-human-receptionist",
    title: "AI Receptionist vs. Human Receptionist: Which Is Better for Your Shop?",
    excerpt: "We compare cost, availability, accuracy, and customer satisfaction between AI and human receptionists for auto repair shops. The answer might surprise you.",
    content: `
## The Honest Comparison

Let's cut through the hype and compare AI receptionists to human receptionists across the metrics that actually matter for your auto repair shop.

## Cost

| | Human Receptionist | AI Receptionist |
|---|---|---|
| Monthly cost | $2,900–$3,750 | $99–$299 |
| Benefits & taxes | $500–$1,000/mo | $0 |
| Training | 2–4 weeks paid | Instant |
| After-hours coverage | Extra cost or none | Included |
| **Total annual cost** | **$42,000–$57,000** | **$1,188–$3,588** |

That's a **92–97% cost reduction** with AI.

## Availability

A human receptionist works 8 hours a day, 5 days a week, minus lunch, breaks, sick days, and vacations. That's roughly **1,880 hours per year** of actual coverage.

An AI receptionist works **8,760 hours per year** — every hour of every day, including holidays, weekends, and 3 AM on a Tuesday.

## Accuracy

This is where it gets interesting. Human receptionists are better at:
- Reading emotional nuance in complex situations
- Handling truly unusual requests
- Building personal relationships with repeat customers

AI receptionists are better at:
- Never forgetting to ask for the vehicle year, make, and model
- Consistently following the script every single time
- Never having a bad day that affects call quality
- Handling multiple calls simultaneously

## Customer Satisfaction

Recent studies show that **73% of customers can't tell the difference** between a well-configured AI voice agent and a human receptionist on a routine call. For appointment booking and basic inquiries — which make up 80% of shop calls — AI matches or exceeds human performance.

## The Verdict

For most auto repair shops, the optimal setup is:

1. **AI handles the first line** — answers every call, books appointments, answers FAQs
2. **Humans handle escalations** — complex estimates, upset customers, warranty disputes
3. **AI follows up** — sends confirmation texts, appointment reminders, review requests

This hybrid approach gives you 24/7 coverage at a fraction of the cost while keeping the human touch where it matters most.
    `,
    author: "Abdur Rahman",
    authorRole: "Founder, Baylio",
    publishedAt: "2026-03-18",
    readTimeMinutes: 6,
    category: "guides",
    tags: ["AI receptionist", "hiring", "cost comparison", "auto repair shop"],
    metaTitle: "AI vs Human Receptionist for Auto Repair Shops | Baylio",
    metaDescription: "Compare AI and human receptionists for auto repair shops: cost, availability, accuracy, and customer satisfaction side by side.",
    featured: true,
  },
  {
    slug: "how-baylio-answers-calls",
    title: "How Baylio Answers Your Shop's Calls in Under 2 Seconds",
    excerpt: "A behind-the-scenes look at what happens from the moment a customer dials your shop number to when Baylio's AI picks up, books an appointment, and sends a confirmation text.",
    content: `
## The 2-Second Promise

When a customer calls your Baylio-powered shop number, here's exactly what happens — in real time.

## Step 1: The Call Arrives (0ms)

Your customer dials your shop number. Twilio receives the call and instantly sends a webhook to Baylio's servers. No rings, no waiting.

## Step 2: Context Loading (50–200ms)

Baylio identifies which shop the call is for and loads the shop's context:
- Shop name, hours, and location
- Service menu and pricing
- Current appointment availability
- The caller's history (if they've called before)

If we recognize the caller's number, we greet them by name. "Hey Mike, welcome back to Johnson's Auto! How can I help you today?"

## Step 3: AI Agent Connects (200–500ms)

The call is routed to your shop's personalized AI agent. This agent has been configured with:
- Your shop's personality and tone
- Your specific services and specialties
- Your booking rules and availability
- Answers to your most common questions

## Step 4: The Conversation (Real-time)

The AI agent handles the call naturally:
- **Appointment booking:** "I can get you in Thursday at 2 PM for that oil change. Does that work?"
- **Service questions:** "A brake pad replacement typically runs $250–$350 for most vehicles. Want me to schedule an inspection?"
- **Hours and location:** "We're open Monday through Saturday, 7:30 AM to 6 PM. We're located at 1234 Main Street."

## Step 5: Post-Call Actions (Immediate)

After the call ends, Baylio automatically:
1. Creates or updates the customer's profile
2. Books the appointment in your calendar
3. Sends a confirmation text to the customer
4. Logs the call with a full transcript and AI scorecard
5. Syncs the data to your shop management system

## Step 6: You Review (When You're Ready)

Check your dashboard to see:
- Call summary and transcript
- AI performance scorecard (politeness, accuracy, booking rate)
- Customer sentiment analysis
- Any calls that need human follow-up

The entire process — from ring to resolution — takes less time than it would take a human to walk to the phone.
    `,
    author: "Abdur Rahman",
    authorRole: "Founder, Baylio",
    publishedAt: "2026-03-15",
    readTimeMinutes: 4,
    category: "product-updates",
    tags: ["how it works", "AI technology", "call flow", "Baylio"],
    metaTitle: "How Baylio Answers Calls in Under 2 Seconds | Baylio",
    metaDescription: "See exactly how Baylio's AI answers your auto repair shop calls in under 2 seconds, books appointments, and sends confirmations.",
    featured: false,
  },
  {
    slug: "5-integrations-every-shop-needs",
    title: "5 Integrations Every Auto Repair Shop Needs in 2026",
    excerpt: "Google Calendar, CRM, shop management software, SMS, and analytics — here's why connecting your tools matters and how to do it without becoming an IT expert.",
    content: `
## The Connected Shop Wins

Running an auto repair shop in 2026 means juggling a dozen different tools: your shop management system, phone, calendar, customer database, texting platform, and more. When these tools don't talk to each other, you waste hours on manual data entry and things fall through the cracks.

Here are the 5 integrations that make the biggest difference.

## 1. Google Calendar — Your Single Source of Truth

**Why:** Every appointment booked by phone, online, or walk-in should appear in one calendar. When your AI answers a call and books a slot, it should instantly show up where your team can see it.

**The impact:** No more double-bookings. No more sticky notes. Your service advisors see the day's schedule at a glance.

## 2. CRM (HubSpot, Salesforce, or Similar)

**Why:** Every caller becomes a contact. Their vehicle info, service history, and preferences are tracked automatically. When they call back, you (or your AI) already know who they are.

**The impact:** "Hey Mike, is this about your 2019 F-150? Last time we did the 60K service — are you due for brakes?" That's the kind of personalization that builds loyalty.

## 3. Shop Management Software (Shopmonkey, Tekmetric, Mitchell)

**Why:** When a call results in a booked appointment, the work order should be created automatically in your shop management system. No re-typing.

**The impact:** Your techs see the job on their screen before the customer even arrives. Parts can be pre-ordered. Bay time is optimized.

## 4. SMS / Text Messaging

**Why:** 98% of text messages are read within 3 minutes. After every call, send an automatic confirmation: "Thanks for calling Johnson's Auto! Your oil change is confirmed for Thursday at 2 PM. Reply STOP to opt out."

**The impact:** Fewer no-shows, happier customers, and a professional touch that sets you apart from the shop down the street.

## 5. Analytics Dashboard

**Why:** You can't improve what you don't measure. Track call volume, booking rate, missed calls, peak hours, average call duration, and revenue per call.

**The impact:** Data-driven decisions. Staff your front desk during peak hours. Identify which services generate the most calls. Know exactly what your AI is doing for your bottom line.

## How Baylio Connects Everything

Baylio's integrations dashboard lets you connect all five in under 10 minutes. No IT team required. Just authenticate, configure, and your shop is running on autopilot.
    `,
    author: "Abdur Rahman",
    authorRole: "Founder, Baylio",
    publishedAt: "2026-03-12",
    readTimeMinutes: 5,
    category: "guides",
    tags: ["integrations", "Google Calendar", "CRM", "shop management", "SMS"],
    metaTitle: "5 Must-Have Integrations for Auto Repair Shops | Baylio",
    metaDescription: "Google Calendar, CRM, shop management, SMS, and analytics — the 5 integrations every auto repair shop needs in 2026.",
    featured: false,
  },
  {
    slug: "future-of-ai-in-auto-repair",
    title: "The Future of AI in Auto Repair: What's Coming in the Next 3 Years",
    excerpt: "From voice agents to predictive maintenance to computer vision diagnostics — here's where AI is taking the auto repair industry and how to stay ahead.",
    content: `
## AI Is Already Here — Most Shops Just Don't Know It

When shop owners hear "AI in auto repair," they think of robots replacing technicians. That's not what's happening. AI is replacing the busywork — the phone answering, the scheduling, the data entry — so your team can focus on what they do best: fixing cars.

## What's Here Now (2026)

**AI Voice Agents:** Answer every call, book appointments, answer FAQs. This is the entry point for most shops, and it's already saving shops thousands per month.

**Predictive Analytics:** AI analyzes your call patterns, booking rates, and seasonal trends to predict busy periods and optimize staffing.

**Automated Follow-ups:** Post-service texts, review requests, and maintenance reminders sent automatically based on service history.

## What's Coming (2027–2028)

**Computer Vision Diagnostics:** Upload a photo of a check engine light, a worn tire, or a fluid leak, and AI provides a preliminary diagnosis with confidence scores. This won't replace your technician's expertise, but it will help service advisors give better estimates on the phone.

**Predictive Maintenance Alerts:** Connected to OBD-II data, AI will proactively contact customers when their vehicle is due for service — before the problem becomes an emergency.

**Multi-Language Support:** AI agents that seamlessly switch between English, Spanish, and other languages based on the caller's preference. In markets with diverse populations, this is a game-changer.

**Voice-to-Work-Order:** A customer describes their problem on the phone, and AI automatically generates a preliminary work order with suspected issues, required parts, and estimated labor time.

## What's on the Horizon (2029+)

**Autonomous Scheduling Optimization:** AI manages your entire bay schedule, balancing technician skills, parts availability, customer preferences, and revenue optimization in real time.

**AR-Assisted Remote Diagnostics:** A customer points their phone camera at their engine while on a video call with your AI, which identifies components and guides them through basic checks.

## How to Prepare

1. **Start with phone AI now.** It's the lowest-risk, highest-ROI entry point.
2. **Digitize your processes.** The more data you have, the more AI can help.
3. **Train your team.** AI is a tool, not a replacement. The shops that win will have technicians who know how to work alongside AI.
4. **Stay connected.** Follow industry publications, attend AAPEX and SEMA, and talk to other shop owners who are adopting technology.

The future belongs to the shops that embrace AI as a partner, not a threat.
    `,
    author: "Abdur Rahman",
    authorRole: "Founder, Baylio",
    publishedAt: "2026-03-08",
    readTimeMinutes: 6,
    category: "ai-technology",
    tags: ["future of AI", "auto repair industry", "predictions", "technology"],
    metaTitle: "Future of AI in Auto Repair: 2026–2029 | Baylio",
    metaDescription: "From voice agents to computer vision diagnostics — here's where AI is taking the auto repair industry in the next 3 years.",
    featured: true,
  },
];

/**
 * Get a blog post by slug
 */
export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

/**
 * Get posts filtered by category
 */
export function getPostsByCategory(category: BlogCategory): BlogPost[] {
  return blogPosts.filter((p) => p.category === category);
}

/**
 * Get featured posts
 */
export function getFeaturedPosts(): BlogPost[] {
  return blogPosts.filter((p) => p.featured);
}

/**
 * Get all unique tags
 */
export function getAllTags(): string[] {
  const tags = new Set<string>();
  blogPosts.forEach((p) => p.tags.forEach((t) => tags.add(t)));
  return Array.from(tags).sort();
}
