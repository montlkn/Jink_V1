# Auth, Security, and Permissions (Supabase RLS)

## Summary
Security posture and row-level security (RLS) policies for core tables. JWT-based auth with service-role functions for privileged RPCs.

## Authentication
- Supabase Auth with email or OAuth.
- JWT includes user_id; frontend stores short-lived session and refresh token in secure storage.
- Service role keys used only in edge functions, never in client bundle.

## RLS Principles
- Default deny on all tables.
- Allow read on public building metadata.
- Writes are user-scoped where possible.
- Admin and verifier roles restricted to server-only functions.

## Example Policies (described)
- profiles: user can select row where user_id = auth.uid(); insert on signup; update limited to allowed columns (total_xp, level, vector).
- scans: user can insert where user_id = auth.uid(); read only own scans.
- passport_entries: user can insert/output only own; prevent duplicates by (user_id, building_id) unique index.
- contributions: insert by auth.uid(); select by verified status or own; updates limited to status via verifier function.
- xp_transactions: insert via edge function with service role; select own only.

## Secrets Hygiene
- All API keys stored as environment variables on the edge runtime.
- No secrets in client; runtime feature flags delivered via signed config endpoints.

