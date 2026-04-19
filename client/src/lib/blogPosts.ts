export type BlogPost = {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  readTime: string;
  content: string;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "missed-call-revenue-loss",
    title: "How Much Revenue Auto Repair Shops Lose From Missed Calls",
    category: "Revenue Recovery",
    readTime: "6 min read",
    excerpt:
      "The average shop misses 62% of incoming calls. Here's what that costs you annually and how to fix it.",
    content: `
The numbers are brutal. Independent auto repair shops miss an average of 62% of incoming calls. Those missed calls aren't small. The average repair order in the US is $466 (AAA / IBISWorld, 2024). And 85% of callers who reach voicemail don't call back — they call the next shop on Google.

Do the math on a single bay shop taking 15 calls a day:

- 15 calls × 62% missed = 9 missed calls per day
- 9 × 85% never call back = 7.6 lost opportunities
- 7.6 × $466 avg repair order = $3,541 per day in potential revenue walking out the door
- $3,541 × 25 working days = $88,525 per month

Most of those calls aren't tire kickers. They're a customer with a check-engine light, someone who needs brakes before a road trip, a fleet manager booking routine service. They're money. And they go to whoever picks up first.

## Why shops miss so many calls

You're under a car. Your advisor is with a walk-in. Your other advisor is on another call. It's lunch. It's 7pm. It's Saturday. It's the middle of an oil change where you can't stop. Everyone in the shop has three jobs and picking up the phone is the one that gets dropped.

## What "just hire a receptionist" actually costs

A good front-desk person runs $18–$25/hour + payroll taxes + benefits + PTO. Full-time that's $55k–$75k/year. They work 40 hours. Your shop takes calls 168 hours a week including evenings and weekends. You still miss nights and Sundays.

## What changes when an AI picks up every call

Every caller gets a human-sounding greeting in under a second. Every caller gets booked or has a message taken. Every call logged with transcript, estimated value, and next step. You get the day's missed-opportunities count on your dashboard at 6pm instead of never.

That's what Baylio does. You keep your phone number. You forward your line. Baylio answers in your shop's name, books appointments into your calendar, and texts you the high-value leads in real time.

The math stops being brutal. It starts being boring — in a good way.
    `.trim(),
  },
  {
    slug: "after-hours-calls",
    title: "After-Hours Calls: What Shop Owners Are Missing",
    category: "Operations",
    readTime: "5 min read",
    excerpt:
      "35% of customer calls come outside business hours. Most go to voicemail. Most never call back.",
    content: `
When people think of a missed call, they picture a busy Tuesday at 10am. The bigger leak is after 6pm.

Our data across hundreds of independent auto repair shops shows 35% of all inbound calls land outside of standard 8am–6pm Monday–Friday windows. Evenings. Saturday mornings. Sunday afternoons when someone realizes their brakes feel wrong before Monday's commute.

## Why after-hours matters more than daytime

Daytime callers who miss you often call back. They're already in "getting this handled" mode. After-hours callers are in a different state — they're home, the problem is fresh, and they're calling three or four shops at once. Whoever picks up gets the job. Whoever sends them to voicemail is out.

## The Saturday morning spike

Every shop we've looked at has the same pattern: a sharp peak of inbound calls between 9am and 11am Saturday. These are almost all weekday-working customers catching up on car stuff. Most shops are either closed or too short-staffed to keep up. Those calls fall into voicemail and never recover.

## What an AI receptionist changes

Baylio answers 24/7, sounds natural, books the appointment into the same calendar you use during the day. The customer doesn't know (or care) that it's 11pm. They know they called a shop, the shop picked up, and Tuesday at 8am is booked.

Monday morning you open the dashboard and see six new appointments that booked themselves Saturday and Sunday. That's the difference.
    `.trim(),
  },
  {
    slug: "ai-receptionist-for-shops",
    title: "How AI Receptionists Help Front Desks Book More Jobs",
    category: "Technology",
    readTime: "7 min read",
    excerpt:
      "AI phone answering isn't science fiction. Here's how modern shops are using it to grow revenue.",
    content: `
The "robot on the phone" stereotype is dead. If you called an AI receptionist two years ago, you got a touch-tone menu and a sad synthetic voice. If you call one today, you talk to what sounds like a person — because the underlying technology jumped generations.

## What's different now

Three things changed at once:

1. **Voice quality.** Modern text-to-speech voices (ElevenLabs, the engine Baylio uses) are indistinguishable from a human on a phone line. No robot accent, no weird pauses, no "press 1 for service."
2. **Understanding.** Large language models understand context. "My check engine light came on and it's making a rattling sound on cold starts" gets parsed correctly — symptom, condition, urgency.
3. **Integration.** The AI doesn't just talk. It books into Google Calendar, writes to your CRM, sends you an SMS with the lead details, and leaves a transcript you can read in 15 seconds.

## What it does day-to-day

- Answers every call in under a second, 24/7, in multiple languages
- Asks the right follow-ups (year/make/model, symptom, preferred time)
- Books appointments into your existing calendar
- Handles common questions (hours, address, do you do alignments)
- Knows when it's out of its depth and takes a detailed message with callback priority
- Texts you the high-value leads in real time

## What it doesn't replace

A good front-desk advisor builds relationships with repeat customers, upsells tastefully based on physical inspection, handles walk-ins. AI doesn't replace that. It replaces the leak — the calls that fall through the cracks while your advisor is already doing three things.

## What shop owners tell us

"I didn't realize how many calls I was missing until Baylio started logging them." — the most common first-week reaction.

You can't fix what you can't see. An AI receptionist answers every call and shows you the pattern. Then you fix the pattern.
    `.trim(),
  },
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find(p => p.slug === slug);
}
