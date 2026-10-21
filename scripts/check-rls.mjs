#!/usr/bin/env node
// RLS regression guard.
//
// Fails if any table in the `public` schema has Row-Level Security disabled.
// This is the guard that would have caught the 2026-06-02 Data API exposure:
// every public table must have RLS enabled so the anon/authenticated roles used
// by Supabase's PostgREST Data API cannot read or write it.
//
// Connects via DATABASE_URL. If unset, the check is skipped (exit 0) with a
// notice, so it never produces false CI failures before the secret is wired —
// set the DATABASE_URL repo secret to enforce.
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
  console.warn('[rls-guard] DATABASE_URL not set — skipping. Add the secret to enforce.')
  process.exit(0)
}

// Tables intentionally allowed to have RLS disabled (none expected). Add an
// entry here with a comment if you ever have a deliberate exception.
const ALLOWLIST = new Set([])

const sql = postgres(url, { max: 1, idle_timeout: 5, connect_timeout: 15, prepare: false })

let code = 0
try {
  const rows = await sql`
    select tablename
    from pg_tables
    where schemaname = 'public' and rowsecurity = false
    order by tablename`
  const offenders = rows.map((r) => r.tablename).filter((t) => !ALLOWLIST.has(t))
  if (offenders.length > 0) {
    console.error('[rls-guard] FAIL — public tables without RLS enabled:')
    for (const t of offenders) console.error(`  - public.${t}`)
    console.error('\nFix: ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;')
    console.error('Server access via the postgres/service_role connection bypasses RLS, so this is safe for server-only apps.')
    code = 1
  } else {
    console.log('[rls-guard] OK — all public tables have RLS enabled.')
  }
} catch (err) {
  console.error('[rls-guard] error running check:', err && err.message ? err.message : err)
  code = 2
} finally {
  await sql.end({ timeout: 5 })
}
process.exit(code)
