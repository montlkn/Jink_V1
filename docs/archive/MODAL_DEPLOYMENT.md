# Modal Deployment Guide

Step-by-step instructions for deploying the profile summary service to Modal.

---

## 1. Prerequisites
- Modal account with the CLI configured (`pip install modal`, `python -m modal setup`)
- Supabase project with `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Upstash (or compatible) Redis URL
- Gemini API key
- Local checkout of this repository

---

## 2. Configure Secrets in Modal

Create four secrets in Modal matching the environment variables consumed by the service:

| Modal Secret Name          | Value                                          |
|---------------------------|------------------------------------------------|
| `GEMINI_API_KEY`          | Gemini API key                                 |
| `REDIS_URL`               | Redis connection string                        |
| `SUPABASE_URL`            | Supabase project URL                           |
| `SUPABASE_SERVICE_KEY`    | Supabase service role key                      |

You can set them from the CLI:

```bash
modal secret create GEMINI_API_KEY --from-file <path-to-file-with-key>
modal secret create REDIS_URL --literal redis://:password@host:port/0
modal secret create SUPABASE_URL --literal https://your-project.supabase.co
modal secret create SUPABASE_SERVICE_KEY --from-file <path-to-service-key-file>
```

---

## 3. Deploy the Modal App

The deployment entrypoint lives at the repository root: `modal_app.py`.

```bash
modal deploy modal_app.py
```

During the image build Modal will install Node.js, copy `apps/server`, install dependencies, and expose three HTTP endpoints:

- `GET /healthz`
- `GET /v1/profile/summary`
- `POST /v1/profile/summary/regenerate`
- `GET /v1/profile/summary/meta`

Modal returns a stable URL after deployment, e.g. `https://aesthetic-profile-summary--summary.modal.run`.

---

## 4. Update the Mobile Client

Set the Expo environment variable to point at the Modal endpoint:

```bash
EXPO_PUBLIC_API_URL="https://<your-app>.modal.run"
```

For local testing you can override this in `.env`, `app.config.ts`, or the Expo development settings.

---

## 5. Operational Notes

- Modal containers spin up on demand; cold starts typically stay under 2 seconds for this image.
- Redis and Supabase credentials are injected via Modal secrets, so no extra env files are needed inside the container.
- `apps/server/bin/modal-entry.js` wraps the existing summary service logic; the Express server can still run locally via `npm run dev` if desired.
- Monitor usage from the Modal dashboard. You only accrue cost when the endpoints are invoked.

Need a hand with a specific Modal workflow? Reach out in `docs/HANDOFF.md` and note the scenario.
