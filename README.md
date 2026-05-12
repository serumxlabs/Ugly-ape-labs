# Ugly Ape Squad — NFT & Token site

Solana project site: collections, project token, holders, team, Discord login, and verify holdings.

## Quick start

```bash
npm install
cp .env.example .env
```

Edit **`.env`**: set `BASE_URL`, `SESSION_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`. Optionally add `DISCORD_BOT_TOKEN` (for Team section avatars), `HELIUS_API_KEY`, `TOKEN_MINT`, `TOKEN_SYMBOL`, collection env vars (`COLLECTION_*`), `BIRDEYE_API_KEY` (for token chart). For **Discord logins saved to DB** and **holders table showing Discord names** (with multiple wallets per user merged into one row), set `DATABASE_URL` and run the migration once (see **Database** below).

```bash
npm start
```

Open `http://localhost:3000`.

## Discord login

1. [Discord Developer Portal](https://discord.com/developers/applications) → create or use an application.
2. **OAuth2 → Redirects**: add `http://localhost:3000/api/discord/callback` (local) and **every production host** you use, e.g. `https://www.yourdomain.com/api/discord/callback` **and** `https://your-app.vercel.app/api/discord/callback`. The server sets `redirect_uri` from the incoming request so users return on the same domain they started on (custom domain vs Vercel URL).
3. Copy **Application ID** → `DISCORD_CLIENT_ID`, and **Client Secret** → `DISCORD_CLIENT_SECRET` in `.env`.
4. For **Team** section avatars: same app → **Bot** → create/reset token → `DISCORD_BOT_TOKEN` in `.env`.
5. Optional: invite a **Discord bot** into a server you control for future channel automations — see [docs/DISCORD-BOT-INVITE.md](docs/DISCORD-BOT-INVITE.md) and `/discord-bot-invite.html?client_id=...`.

## Database (Neon PostgreSQL)

Used for: saving Discord logins, linking wallets to Discord (via Verify), Pairs game state, and the **holders table** (Discord names for linked holders, multiple wallets per Discord user merged into one row).

1. Create a database at [Neon](https://neon.tech) (or any PostgreSQL).
2. In **`.env`** set `DATABASE_URL=postgresql://user:pass@host/db?sslmode=require`.
3. Run the migration once: `npm run db:migrate` (creates `users` and `wallets`).
4. In production (e.g. Vercel), add the same `DATABASE_URL` to environment variables. Run `npm run db:migrate` locally against that URL once, or use Neon’s SQL editor to run the schema from `scripts/db-migrate.js`.

After this, Discord logins are stored in `users`, and when a user **Verify**s (Discord + wallet), the wallet is linked in `wallets`. The holders table then shows Discord names for linked holders and aggregates all wallets with the same Discord ID into one entry.

## Deploy to Vercel

1. **Push** this repo to GitHub and [import it in Vercel](https://vercel.com) as a new project.
2. **Framework**: Other. **Root Directory**: leave default.
3. **Environment Variables** (Vercel → Project → Settings → Environment Variables). Add the same as `.env`:
   - **Required for Discord + database features**: `SESSION_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DATABASE_URL`
   - **Optional**: `BASE_URL` or `SITE_URL` (e.g. `https://your-app.vercel.app` for OG meta), `HELIUS_API_KEY`, `TOKEN_MINT`, `TOKEN_SYMBOL`, `DISCORD_BOT_TOKEN`, `BIRDEYE_API_KEY`, collection mints / Magic Eden slugs, `ADMIN_DISCORD_IDS` (merch wait list export)
4. **Discord redirect**: Same as local setup — whitelist **each** callback URL (custom domain and Vercel default domain if both are used). Missing entries cause OAuth errors for that host.
5. **Database**: Run `npm run db:migrate` once against your production `DATABASE_URL` (from your machine: `DATABASE_URL=postgresql://... npm run db:migrate`) so `users` and `wallets` exist.
6. **Deploy**: push to your main branch or trigger a deploy from the Vercel dashboard.

**`npm run vercel-build`** copies the site into **`public/`**, then replaces `{{SITE_URL}}` in **`public/index.html` only** so the repo root keeps placeholders for Open Graph/Twitter URLs.

## Project config

Site copy and links are in **`js/config.js`** as **`window.UGLY_APE_SQUAD_CONFIG`** (project name, token, hero, footer, team, social, etc.). Edit there to change branding or team members. Team entries use `xProfileUrl`, `discordId`, and `description`; with `DISCORD_BOT_TOKEN` set, the site fetches Discord usernames and avatars.

## Static-only (no backend)

To serve only the static files (no Discord login or API): use any static server (e.g. `npx serve .`). API and Discord features will not work unless you point to an external backend via config.
