#!/bin/bash

# setup-niche.sh — Baylio Niche Environment Configuration Script
# 
# This script configures Stripe, Twilio, and ElevenLabs for a new Baylio niche.
# Run after Claude Code generates the niche config files.
#
# Usage: bash setup-niche.sh

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Baylio Niche Environment Configuration${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# ─── Step 1: Validate Prerequisites ──────────────────────────────────────

echo -e "${YELLOW}Step 1: Validating prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq is not installed (optional, for JSON parsing)${NC}"
fi

echo -e "${GREEN}✅ Prerequisites validated${NC}"
echo ""

# ─── Step 2: Gather Stripe Configuration ─────────────────────────────────

echo -e "${YELLOW}Step 2: Stripe Configuration${NC}"
echo "Get your Stripe API keys from: https://dashboard.stripe.com/apikeys"
echo ""

read -p "Enter Stripe Secret Key (sk_test_...): " STRIPE_SECRET_KEY
read -p "Enter Stripe Publishable Key (pk_test_...): " VITE_STRIPE_PUBLISHABLE_KEY
read -p "Enter Stripe Webhook Secret (whsec_...): " STRIPE_WEBHOOK_SECRET

if [[ ! $STRIPE_SECRET_KEY =~ ^sk_test_ ]] && [[ ! $STRIPE_SECRET_KEY =~ ^sk_live_ ]]; then
    echo -e "${RED}❌ Invalid Stripe Secret Key format${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Stripe keys validated${NC}"
echo ""

# ─── Step 3: Gather Twilio Configuration ─────────────────────────────────

echo -e "${YELLOW}Step 3: Twilio Configuration${NC}"
echo "Get your Twilio credentials from: https://twilio.com/console"
echo ""

read -p "Enter Twilio Account SID: " TWILIO_ACCOUNT_SID
read -p "Enter Twilio Auth Token: " TWILIO_AUTH_TOKEN
read -p "Enter Twilio Sales Phone Number (E.164 format, e.g., +18448752441): " BAYLIO_SALES_PHONE

if [[ ! $BAYLIO_SALES_PHONE =~ ^\+1[0-9]{10}$ ]]; then
    echo -e "${RED}❌ Invalid phone number format. Use E.164 format: +1XXXXXXXXXX${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Twilio credentials validated${NC}"
echo ""

# ─── Step 4: Gather ElevenLabs Configuration ──────────────────────────────

echo -e "${YELLOW}Step 4: ElevenLabs Configuration${NC}"
echo "Get your ElevenLabs API key from: https://elevenlabs.io/app/settings/api-keys"
echo ""

read -p "Enter ElevenLabs API Key: " ELEVENLABS_API_KEY
read -p "Enter ElevenLabs Agent ID (create new agent in dashboard): " ELEVENLABS_AGENT_ID

if [[ -z "$ELEVENLABS_API_KEY" ]] || [[ -z "$ELEVENLABS_AGENT_ID" ]]; then
    echo -e "${RED}❌ ElevenLabs API key and Agent ID are required${NC}"
    exit 1
fi

echo -e "${GREEN}✅ ElevenLabs credentials validated${NC}"
echo ""

# ─── Step 5: Create .env.local ───────────────────────────────────────────

echo -e "${YELLOW}Step 5: Creating .env.local...${NC}"

cat > .env.local << EOF
# Stripe Configuration
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET

# Twilio Configuration
TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN
BAYLIO_SALES_PHONE=$BAYLIO_SALES_PHONE

# ElevenLabs Configuration
ELEVENLABS_API_KEY=$ELEVENLABS_API_KEY
ELEVENLABS_AGENT_ID=$ELEVENLABS_AGENT_ID

# Database (auto-configured by Manus)
DATABASE_URL=\${DATABASE_URL:-}

# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET=\${JWT_SECRET:-}

# OAuth Configuration (auto-configured by Manus)
VITE_APP_ID=\${VITE_APP_ID:-}
OAUTH_SERVER_URL=\${OAUTH_SERVER_URL:-}
VITE_OAUTH_PORTAL_URL=\${VITE_OAUTH_PORTAL_URL:-}

# Owner Information (auto-configured by Manus)
OWNER_OPEN_ID=\${OWNER_OPEN_ID:-}
OWNER_NAME=\${OWNER_NAME:-}

# Manus Built-in APIs (auto-configured by Manus)
BUILT_IN_FORGE_API_URL=\${BUILT_IN_FORGE_API_URL:-}
BUILT_IN_FORGE_API_KEY=\${BUILT_IN_FORGE_API_KEY:-}
VITE_FRONTEND_FORGE_API_URL=\${VITE_FRONTEND_FORGE_API_URL:-}
VITE_FRONTEND_FORGE_API_KEY=\${VITE_FRONTEND_FORGE_API_KEY:-}

# Analytics (auto-configured by Manus)
VITE_ANALYTICS_ENDPOINT=\${VITE_ANALYTICS_ENDPOINT:-}
VITE_ANALYTICS_WEBSITE_ID=\${VITE_ANALYTICS_WEBSITE_ID:-}

# App Configuration
VITE_APP_TITLE=\${VITE_APP_TITLE:-Baylio}
VITE_APP_LOGO=\${VITE_APP_LOGO:-}
EOF

echo -e "${GREEN}✅ .env.local created${NC}"
echo ""

# ─── Step 6: Verify Stripe Connection ────────────────────────────────────

echo -e "${YELLOW}Step 6: Verifying Stripe connection...${NC}"

STRIPE_TEST=$(curl -s -H "Authorization: Bearer $STRIPE_SECRET_KEY" \
    https://api.stripe.com/v1/account | jq -r '.id // empty' 2>/dev/null || echo "")

if [[ -z "$STRIPE_TEST" ]]; then
    echo -e "${RED}❌ Failed to connect to Stripe. Check your API key.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Stripe connection verified${NC}"
echo ""

# ─── Step 7: Verify Twilio Connection ────────────────────────────────────

echo -e "${YELLOW}Step 7: Verifying Twilio connection...${NC}"

TWILIO_TEST=$(curl -s -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
    https://api.twilio.com/2010-04-01/Accounts.json | jq -r '.accounts[0].sid // empty' 2>/dev/null || echo "")

if [[ -z "$TWILIO_TEST" ]]; then
    echo -e "${RED}❌ Failed to connect to Twilio. Check your credentials.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Twilio connection verified${NC}"
echo ""

# ─── Step 8: Verify ElevenLabs Connection ────────────────────────────────

echo -e "${YELLOW}Step 8: Verifying ElevenLabs connection...${NC}"

ELEVENLABS_TEST=$(curl -s -H "xi-api-key: $ELEVENLABS_API_KEY" \
    https://api.elevenlabs.io/v1/user | jq -r '.subscription.character_limit // empty' 2>/dev/null || echo "")

if [[ -z "$ELEVENLABS_TEST" ]]; then
    echo -e "${RED}❌ Failed to connect to ElevenLabs. Check your API key.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ ElevenLabs connection verified${NC}"
echo ""

# ─── Step 9: Summary ─────────────────────────────────────────────────────

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Environment Configuration Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Verify .env.local was created:"
echo "   cat .env.local"
echo ""
echo "2. Start the development server:"
echo "   pnpm dev"
echo ""
echo "3. Test the sales line:"
echo "   Call $BAYLIO_SALES_PHONE from your phone"
echo ""
echo "4. Verify the AI closes deals:"
echo "   - Let the AI guide you through SPIN selling"
echo "   - Say yes to the offer"
echo "   - Check your phone for SMS with Stripe checkout link"
echo "   - Complete payment with test card: 4242 4242 4242 4242"
echo ""
echo "5. Verify auto-provisioning:"
echo "   - Check your email for welcome message"
echo "   - Log in to dashboard with your email"
echo "   - Verify shop, agent config, and Twilio number were created"
echo ""
echo -e "${YELLOW}Troubleshooting:${NC}"
echo "- If Stripe fails: Check API key at https://dashboard.stripe.com/apikeys"
echo "- If Twilio fails: Check credentials at https://twilio.com/console"
echo "- If ElevenLabs fails: Check API key at https://elevenlabs.io/app/settings/api-keys"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
