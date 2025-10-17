# Environment & Config

## Files
- .env.development – local dev
- .env.preview – staging
- .env.production – prod

## Keys
- SUPABASE_URL, SUPABASE_ANON_KEY (client)
- SUPABASE_SERVICE_ROLE (edge only)
- EXA_API_KEY (edge)
- MAPS_TOKEN (client ok)
- SENTRY_DSN (client + edge)

## Flags
- FEATURE_SEMANTIC_SEARCH
- FEATURE_ORB_SHADER_HEAVY
- FEATURE_PRO_MULTIPLIERS
- PROVIDER_EMBEDDINGS = clip|open-clip|local
