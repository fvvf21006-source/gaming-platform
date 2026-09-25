# 10 — Free Deployment Guide

Deploy the whole platform at no cost:

| Part | Host | Free-tier notes |
|---|---|---|
| Database (PostgreSQL) | **Neon** | Permanent free tier (0.5 GB). No expiry. |
| API (Node/Express) | **Render** web service | Sleeps after ~15 min idle; first request afterwards takes ~30–60 s to wake. |
| Client (React) | **Render** static site | Free, always on. |

No credit card is needed for any of them. Points are virtual, so there is nothing regulated about hosting it.

> Why not Render's own Postgres? Its free database is deleted after roughly 30 days. Neon's does not expire.

---

## Step 0 — Put the code on GitHub

Render deploys from your GitHub repo (`fvvf21006-source/gaming-platform`).

1. Commit everything on your working branch and push it.
2. Render builds the repo's **default branch** unless told otherwise. Either merge your branch into that branch (usually `main`), or choose your branch when creating the Blueprint in Step 3.

Secrets are safe: `.env` files are git-ignored, and the development admin seed is never run in production.

## Step 1 — Create the free database (Neon)

1. Sign up at <https://neon.tech> (GitHub login works).
2. **Create project** → name it `gaming-platform` → pick the region closest to you.
3. On the project dashboard click **Connect**, and copy the **connection string**. It looks like:
   `postgresql://neondb_owner:xxxx@ep-something-123.us-east-2.aws.neon.tech/neondb?sslmode=require`
4. Keep that tab open — you paste it into Render in Step 3. Treat it like a password.

Tables are created automatically on the API's first start; you do not run any SQL by hand.

## Step 2 — Decide your Super Admin login

You choose these now and type them into Render in Step 3:

- `SUPER_ADMIN_USERNAME` — e.g. `admin`
- `SUPER_ADMIN_EMAIL` — your email
- `SUPER_ADMIN_PASSWORD` — strong, 8+ characters. **Not** `Admin@123`.

They are only used once, to create the account if none exists.

## Step 3 — Deploy on Render

1. Sign up at <https://render.com> with GitHub.
2. **New → Blueprint** → select the `gaming-platform` repo (and branch, if not the default).
3. Render reads `render.yaml` and lists two services: `gaming-platform-api` and `gaming-platform-client`.
4. Fill the prompted values:
   - `DATABASE_URL` → the Neon string from Step 1
   - `SUPER_ADMIN_USERNAME`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` → from Step 2
   - Leave `CLIENT_URL` and `VITE_API_BASE_URL` **blank for now** (they need each other's URL).
5. Click **Apply**. Both services build (a few minutes). The API may show an error at first because `CLIENT_URL` is empty — expected, fixed next.

## Step 4 — Connect the two URLs

Once both services exist, note their public URLs (top of each service page), for example:

- API: `https://gaming-platform-api.onrender.com`
- Client: `https://gaming-platform-client.onrender.com`

Then, with **no trailing slash**:

1. Open the **API** service → **Environment** → set `CLIENT_URL` = the client URL → save. It redeploys.
2. Open the **client** service → **Environment** → set `VITE_API_BASE_URL` = the API URL → save, then **Manual Deploy → Clear build cache & deploy**. (This value is baked in at build time, so a rebuild is required.)

## Step 5 — Verify

1. Open `<API URL>/health` → should show `{"status":"OK"}`. (First hit may take ~1 minute while it wakes.)
2. Open the client URL, sign in with your Super Admin credentials.
3. Create a Level 1 account, then keep going down the hierarchy to a Player. Add points to the player with **Wallet → Adjust**, then sign in as that player to see the arcade lobby.
4. Refresh on a deep link such as `/users` — it should load, not 404.

## Everyday notes

- **Cold starts:** the free API sleeps when idle. To hide the delay, ping `<API URL>/health` every ~10 minutes with a free monitor such as UptimeRobot.
- **Redeploys:** pushing to the deployed branch redeploys automatically. Database changes go in new migration files; they apply on the next API start.
- **Rotate secrets:** change `SUPER_ADMIN_PASSWORD` by signing in and using *Profile → change password* — the env value is not used again.
- **Free-tier limits:** Render free services get ~750 hours/month; Neon free has 0.5 GB storage. Both are far beyond what a demo needs.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Login fails with a network / CORS error | `CLIENT_URL` on the API doesn't exactly match the client URL (check `https`, no trailing slash), or `VITE_API_BASE_URL` wasn't set before the client build — redeploy the client. |
| API log: `Missing required environment variables` | Fill `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL` in the API's Environment tab. |
| API log: `no pg_hba.conf entry` / SSL error | The Neon string must end with `?sslmode=require`. |
| API log: `SUPER_ADMIN_… must be set` | Add the three `SUPER_ADMIN_*` variables (first deploy only). |
| Client shows blank page or 404 on refresh | The SPA rewrite in `render.yaml` didn't apply — in the client service, Redirects/Rewrites, add `/*` → `/index.html` (Rewrite). |
| First page load is very slow | Free API waking from sleep. Wait ~1 minute, or use a keep-alive ping. |

## Alternative hosts

The client is a plain static build (`npm run build` → `client/dist`), so it also deploys free on Vercel, Netlify or Cloudflare Pages: set the root directory to `client`, build command `npm run build`, output `dist`, env `VITE_API_BASE_URL`, and add an SPA fallback (`/* → /index.html`). The API only needs Node 20+ and the same environment variables.
