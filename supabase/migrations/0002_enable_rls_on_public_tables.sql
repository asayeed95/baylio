-- 0002_enable_rls_on_public_tables.sql
-- Security fix (2026-06-02): close the Data API (PostgREST) exposure on every
-- public table. With RLS off, the `anon`/`authenticated` roles behind Supabase's
-- auto-generated REST API could read/write every row using only the public anon
-- key + project URL — including caller_profiles (PII), call_logs (transcripts),
-- subscriptions, and shop_integrations (OAuth tokens).
--
-- Baylio is accessed server-side only (Express/tRPC -> Drizzle over DATABASE_URL)
-- using a BYPASSRLS role (postgres/service_role), so enabling RLS with NO policies
-- denies the public roles while leaving application access fully intact.
--
-- NOTE: the live database is Supabase Postgres. The drizzle/ journal is a stale
-- artifact from the TiDB/MySQL era and is not the migration source of truth for
-- this change; it was applied via the Supabase migration ledger.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missed_call_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_call_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sam_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
