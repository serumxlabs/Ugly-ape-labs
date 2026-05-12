# Discord bot invite (optional)

The site uses **`DISCORD_BOT_TOKEN`** so the server can call Discord’s API to resolve Discord user IDs to **usernames and avatars** (for example the **Team** section via `GET /api/discord/public-users`).

This is separate from **OAuth** (`DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`), which powers “Log in with Discord” for visitors.

## Invite URL

Use your app’s **Application ID** from [Discord Developer Portal](https://discord.com/developers/applications) → your application → **OAuth2** → **General** → **CLIENT ID**.

Open **`/discord-bot-invite.html?client_id=YOUR_CLIENT_ID`** on your site, or build the invite link manually with the scopes and permissions you need.

A typical **bot + slash commands** scope string is: `bot%20applications.commands`.

## Permissions

Grant only what you need. For fetching public user profiles by ID, the bot does not need to join every user’s server; it only needs the **Bot** token on the **same application** you use for OAuth, with Discord’s normal API access to user objects the bot is allowed to see.

For a bot that will also post in a **server channel** later, add permissions such as **View Channel**, **Send Messages**, and **Embed Links** for that channel, and install the bot into that server via the invite URL.

## Environment

| Variable | Purpose |
|----------|---------|
| `DISCORD_BOT_TOKEN` | Bot token from the Developer Portal → **Bot** → token. Used for Team avatars / `public-users` and similar server-side Discord API calls. |

There is **no** raffle-specific channel variable on this project.
