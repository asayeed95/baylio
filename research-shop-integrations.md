# Auto Repair Shop Management Software — API Integration Research

## The Landscape (March 2026)

### Tier 1: Modern Cloud-Native (HAVE APIs)

**Tekmetric** — BEST integration story
- Full REST API (api.tekmetric.com)
- OAuth 2.0 authentication
- Access: Customers, Vehicles, Repair Orders, Appointments, Employees, Inventory
- Community MCP server already exists (github.com/beetlebugorg/tekmetric-mcp) — ARCHIVED but proves feasibility
- API access requires application (2-3 week approval)
- Read-only access confirmed; write access unclear

**Shopmonkey** — Good API
- REST API with webhooks
- Access: Customers, Orders, integrations
- Documentation at support.shopmonkey.io

**Shop-Ware** — Full API
- REST API at api.shop-ware.com/api/v1/docs
- OData protocol (Microsoft standard)
- API Partner Integration program
- Credentials issued per shop

### Tier 2: Legacy/Hybrid (LIMITED or NO APIs)

**ALLDATA (Manage Online)** — NO shop management API
- ALLDATA Connect is for OEM repair DATA (diagnostic info, repair procedures)
- NOT for shop management operations (scheduling, customers, ROs)
- No API to create appointments, update repair orders, or manage customers
- Integrates with QuickBooks, CarFax, Worldpay but via their own connectors

**Mitchell1 (Manager SE)** — VERY LIMITED
- ProDemand has an API (repair information lookup only)
- Manager SE itself: desktop-installed software, no public API
- RepairCenter Transactional API exists but for collision (Mitchell International), NOT Mitchell1
- Third-party integration requires formal partnership request
- Essentially a closed system

### Tier 3: Other Players
- AutoLeap — Cloud-based, likely has API (newer platform)
- Shop Boss — Cloud-based, API status unknown
- Garage360 — Newer entrant, API status unknown

## Key Insight

The market is split:
- ~40% of shops use modern cloud SMS (Tekmetric, Shopmonkey, Shop-Ware) → API integration possible
- ~60% of shops use legacy systems (ALLDATA Manage, Mitchell1 Manager SE, paper) → NO API available

## Claude Computer Use Assessment

For legacy systems (ALLDATA Manage Online, Mitchell1 Manager SE):
- These are web-based or desktop apps with NO APIs
- Claude Computer Use could theoretically navigate their UI
- BUT: requires running on the shop's computer, managing credentials, handling UI changes
- Reliability: ~66% success rate on OSWorld benchmarks (Opus 4.5)
- NOT production-ready for mission-critical operations like booking appointments
- Would need a dedicated VM per shop running 24/7
- Cost: Claude API calls + VM hosting per shop = expensive and fragile
