# Claude Code — Baylio Niche Replication System

This document enables Claude Code and Claude Desktop to autonomously replicate the Baylio SaaS platform for any vertical (dental, restaurant, real estate, etc.) in a single prompt.

## Quick Start

### Option 1: Interactive Mode (Claude Asks Questions)

```
Load REPLICATION_PROMPT.md into Claude Code context, then ask:

"I want to replicate Baylio for [VERTICAL]. Guide me through the niche replication process."

Claude will:
1. Ask you 20-30 questions about the niche (vertical, pricing, services, competitors, etc.)
2. Build a niche configuration from your answers
3. Generate all files and environment setup
4. Provide step-by-step deployment instructions
```

### Option 2: Auto-Generate Mode (Provide JSON Input)

```
Load REPLICATION_PROMPT.md and niche-config.json into Claude Code context, then ask:

"Replicate Baylio using this niche config: [PASTE niche-config.json]"

Claude will:
1. Validate the niche JSON
2. Generate all files automatically
3. Create environment variable setup script
4. Output ready-to-deploy codebase
```

## Files in This System

| File | Purpose |
|------|---------|
| `REPLICATION_PROMPT.md` | Mega-prompt that teaches Claude the full replication workflow |
| `niche-config.json` | Template for niche input data (copy, customize, paste into Claude) |
| `setup-niche.sh` | Shell script to configure Stripe, Twilio, ElevenLabs environment |
| `CLAUDE.md` | This file — instructions for Claude Code |

## What Claude Will Generate

When you run either mode, Claude Code will create/modify:

### Config Files
- `shared/nicheConfig.ts` — Niche-specific branding, industry knowledge, pricing, sales scripts
- `server/services/prompts/[nicheNameSalesAgent].ts` — Sales prompt for the new vertical

### Service Files
- `server/services/onboardService.ts` — Updated tier pricing
- `server/stripe/products.ts` — Updated product definitions
- `server/services/autoProvisionService.ts` — Updated welcome SMS templates

### Frontend Files
- `client/src/pages/Home.tsx` — Updated landing page copy
- `client/src/index.css` — Updated color theme
- `client/index.html` — Updated meta tags and favicon reference

### Environment Setup
- `.env.local` — Placeholder for API keys (you fill in the values)
- `setup-niche.sh` — Script to configure Stripe products, Twilio numbers, ElevenLabs agents

## How to Use

### Step 1: Open Claude Code

```bash
# On your Mac with Claude Code installed
claude-code /path/to/baylio
```

### Step 2: Load the Replication System

In Claude Code, paste this into the context:

```
Read these files into context:
- REPLICATION_PROMPT.md
- niche-config.json
- shared/nicheConfig.ts (current Baylio config for reference)
- NICHE_REPLICATION_GUIDE.md (step-by-step guide)
```

### Step 3: Choose Your Mode

**Interactive Mode:**
```
"I want to replicate Baylio for dental offices. Walk me through the replication process step by step."
```

**Auto-Generate Mode:**
```
"Here's my niche config for DentFlow. Generate all files and environment setup.

[PASTE niche-config.json with your values]
```

### Step 4: Review and Deploy

Claude will output:
1. All modified files (copy into your project)
2. Environment variable setup instructions
3. Stripe/Twilio/ElevenLabs configuration steps
4. Deployment checklist

## Example Niche Configs

See `niche-config.json` for the template. Examples:

### Dental (DentFlow)
```json
{
  "brand": {
    "name": "DentFlow",
    "pronunciation": "DENT-flow",
    "tagline": "AI Call Assistant for Dental Offices"
  },
  "industry": {
    "vertical": "dental",
    "avgTicketValue": 288,
    "commonServices": ["Teeth cleaning", "Dental exam", "Cavity filling", ...]
  }
  // ... (see niche-config.json template)
}
```

### Real Estate (PropertyAI)
```json
{
  "brand": {
    "name": "PropertyAI",
    "pronunciation": "PROP-er-tee-AY",
    "tagline": "AI Call Assistant for Real Estate Agents"
  },
  "industry": {
    "vertical": "real_estate",
    "avgTicketValue": 8000,
    "commonServices": ["Property inquiry", "Showing scheduling", "Offer discussion", ...]
  }
  // ... (see niche-config.json template)
}
```

## Environment Setup

After Claude generates the files, run:

```bash
bash setup-niche.sh
```

This script will:
1. Prompt for Stripe API keys and create products
2. Prompt for Twilio credentials and purchase a sales number
3. Prompt for ElevenLabs API key and create a new agent
4. Generate `.env.local` with all credentials

## Validation

Claude will validate:
- ✅ Niche JSON structure (required fields, correct types)
- ✅ Pricing tiers (starter < pro < elite)
- ✅ Sales prompt structure (SPIN phases, objection handling)
- ✅ File paths and imports
- ✅ TypeScript compilation
- ✅ Test suite passes

## Troubleshooting

**"Claude doesn't understand the replication workflow"**
→ Make sure `REPLICATION_PROMPT.md` is loaded into context. It contains the full system architecture.

**"Generated files have TypeScript errors"**
→ Claude will run `npx tsc --noEmit` and fix errors. If issues persist, ask Claude to "fix TypeScript errors in the generated files."

**"Environment setup fails"**
→ Run `setup-niche.sh` manually and provide API keys when prompted. Claude can also help debug.

**"Tests don't pass"**
→ Ask Claude to "run the test suite and fix any failing tests."

## Next Steps

1. **Test the generated niche** — Call the sales number, verify the AI closes deals
2. **Deploy to production** — Update domain, publish landing page
3. **Monitor metrics** — Track calls answered, conversion rate, revenue
4. **Iterate** — Ask Claude to improve the sales prompt based on real call data

## Support

For issues or improvements to this system, ask Claude Code:
- "Improve the niche replication workflow"
- "Add support for [new feature]"
- "Debug why [specific file] isn't working"

Claude will iterate on the system and improve it over time.

---

**Author:** Manus AI for Abdur's AI App Factory  
**Version:** 1.0  
**Last Updated:** March 19, 2026
