# Deploy to Vercel — checklist

Use this when deploying so the team can test the live site (Discord, holders, token section, etc.).

## 1. Repo and Vercel project

- Push the repo to GitHub.
- In [Vercel](https://vercel.com): **Add New** → **Project** → import the repo.
- **Framework Preset**: Other. **Root Directory**: (leave default).

## 2. Environment variables

In Vercel: **Project** → **Settings** → **Environment Variables**. Add these (same as your local `.env`):

| Variable | Required | Notes |
|----------|----------|--------|
| `SESSION_SECRET` | Yes | Long random string (e.g. 32+ chars). |
| `DISCORD_CLIENT_ID` | Yes (for Discord) | From Discord Developer Portal. |
| `DISCORD_CLIENT_SECRET` | Yes (for Discord) | From Discord Developer Portal. |
| `DATABASE_URL` | Yes (for Discord logins + wallet linking + holders) | PostgreSQL connection string (e.g. Neon). |
| `SITE_URL` | **Required for link embeds** | Your live URL, e.g. `https://your-app.vercel.app`. Used for `og:image` and `og:url` so shared links show the logo and description in Discord/Twitter/etc. |
| `HELIUS_API_KEY` | Yes (for collections / RPC-backed features) | From [Helius](https://dashboard.helius.dev). |
| `ADMIN_DISCORD_IDS` | Optional | Comma-separated Discord user IDs allowed to export the merch **wait list** (`GET /api/wait-list/all`). |
| `TOKEN_MINT` | Optional | Project SPL mint for prices, verify, holders, and charts. |
| `TOKEN_SYMBOL` | Optional | Ticker label in UI (default `TOKEN`). |
| `DISCORD_BOT_TOKEN` | Optional | For Team section avatars (`/api/discord/public-users`). See [docs/DISCORD-BOT-INVITE.md](docs/DISCORD-BOT-INVITE.md). |
| `BIRDEYE_API_KEY` | Optional | For token chart. |

## 3. Discord callback URL

In [Discord Developer Portal](https://discord.com/developers/applications) → your app → **OAuth2** → **Redirects**:

- Add: `https://<your-vercel-domain>/api/discord/callback`  
  (e.g. `https://your-app.vercel.app/api/discord/callback`)

## 4. Database migration (once per production DB)

Creates **`users`** and **`wallets`**. The merch wait list table is created automatically on first use when the wait-list API runs.

From your machine (with production `DATABASE_URL` set or passed):

```bash
DATABASE_URL="postgresql://..." npm run db:migrate
```

Or run the SQL from `scripts/db-migrate.js` in your DB’s SQL editor.

## 5. Deploy

- **Deploy** from the Vercel dashboard, or push to the connected branch.
- Build runs `npm run vercel-build` (injects `SITE_URL` into HTML, copies static files).

## 6. Test

- Open `https://your-app.vercel.app`.
- Log in with Discord, connect a wallet from **Verify**, and confirm **Holders** / **Team** behave as expected.

## Troubleshooting

- **Discord OAuth errors**: Confirm redirect URLs match every host you use (custom domain and `*.vercel.app` if both).
- **Holders without Discord names**: Confirm `DATABASE_URL` is set and wallets are linked after Verify.
