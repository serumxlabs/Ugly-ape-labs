/**
 * Ugly Ape Squad — Express server with Discord OAuth2 login
 * Serves static site and provides /api/* routes.
 *
 * Required env: DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, SESSION_SECRET, BASE_URL (fallback)
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const cookieSession = require('cookie-session');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const bs58 = require('bs58');

const app = express();
/* Required on Vercel / reverse proxies so secure cookies and req.protocol are correct */
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

const DEFAULT_SESSION_SECRET = 'ugly-ape-squad-session-secret-change-in-production';
const SESSION_SECRET = process.env.SESSION_SECRET || DEFAULT_SESSION_SECRET;
/** Do not process.exit() here: Vercel runs `vercel build` with NODE_ENV=production and imports this file before env is guaranteed — that killed the build with no visible logs. Invalid prod config is rejected on each request below instead. */

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const BASE_URL = (process.env.BASE_URL || 'http://localhost:' + PORT).replace(/\/$/, '');

/** Public origin for Discord OAuth — must match the site the user opened (custom domain vs *.vercel.app). */
function getOAuthBaseUrl(req) {
  if (process.env.NODE_ENV !== 'production') {
    return BASE_URL;
  }
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
  const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  if (host) return (proto + '://' + host).replace(/\/$/, '');
  return BASE_URL;
}

function discordRedirectUri(req) {
  return getOAuthBaseUrl(req) + '/api/discord/callback';
}

const DISCORD_AUTH_URL = 'https://discord.com/api/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_USER_URL = 'https://discord.com/api/users/@me';
const DISCORD_API_V10 = 'https://discord.com/api/v10';
/** Bot token (not OAuth secret) — used to resolve user id → username/avatar for Team and similar. */
const DISCORD_BOT_TOKEN = (process.env.DISCORD_BOT_TOKEN || '').trim();
const SCOPES = 'identify';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC = 'https://mainnet.helius-rpc.com';
const ME_BASE = 'https://api-mainnet.magiceden.dev/v2';

// Magic Eden collection slugs; countKey appears in /api/verify and /api/holders (col1Count, col2Count)
const COLLECTIONS = [
  {
    slug: process.env.COLLECTION_1_ME_SLUG || 'ugly_ape_squad',
    name: process.env.COLLECTION_1_DISPLAY_NAME || 'Ugly Ape Squad',
    collectionMint: process.env.COLLECTION_1_MINT || '',
    countKey: 'col1Count',
  },
  {
    slug: process.env.COLLECTION_2_ME_SLUG || 'mutant_ugly_ape_squad_collection',
    name: process.env.COLLECTION_2_DISPLAY_NAME || 'Mutant Ugly Ape Squad',
    collectionMint: process.env.COLLECTION_2_MINT || '',
    countKey: 'col2Count',
  },
];

const LAMPORTS_PER_SOL = 1e9;
const PROJECT_TOKEN_MINT = (process.env.TOKEN_MINT || '').trim();
const TOKEN_SYMBOL = (process.env.TOKEN_SYMBOL || 'TOKEN').trim();
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const ATA_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
const TOKEN_DECIMALS = parseInt(process.env.TOKEN_DECIMALS || '6', 10);

/** When TOKEN_DECIMALS is unset in env, fetch mint decimals once from RPC (fixes wrong K/M/B from default 6 vs on-chain 9). */
let cachedMintDecimals = undefined;

function envTokenDecimalsExplicit() {
  const v = process.env.TOKEN_DECIMALS;
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === '') return null;
  const n = parseInt(s, 10);
  if (!Number.isNaN(n) && n >= 0 && n <= 18) return n;
  return null;
}

async function resolveMintDecimals() {
  if (cachedMintDecimals !== undefined) return cachedMintDecimals;
  const explicit = envTokenDecimalsExplicit();
  if (explicit !== null) {
    cachedMintDecimals = explicit;
    return explicit;
  }
  if (!HELIUS_API_KEY || !PROJECT_TOKEN_MINT) {
    cachedMintDecimals = TOKEN_DECIMALS;
    return cachedMintDecimals;
  }
  try {
    const res = await axios.post(
      `${HELIUS_RPC}/?api-key=${HELIUS_API_KEY}`,
      {
        jsonrpc: '2.0',
        id: 'mint-decimals',
        method: 'getAccountInfo',
        params: [PROJECT_TOKEN_MINT, { encoding: 'jsonParsed' }],
      },
      { timeout: 8000, validateStatus: () => true }
    );
    const parsed = res.data?.result?.value?.data?.parsed;
    const dec = parsed?.info?.decimals;
    if (typeof dec === 'number' && dec >= 0 && dec <= 18) {
      cachedMintDecimals = dec;
      return dec;
    }
  } catch (e) {
    console.warn('resolveMintDecimals failed:', e.message);
  }
  cachedMintDecimals = TOKEN_DECIMALS;
  return cachedMintDecimals;
}
/** Dexscreener **pair** address (same id as dexscreener.com/solana/...) — optional OHLC + fallback when mint typo */
const DEXSCREENER_PAIR_ADDRESS = (process.env.DEXSCREENER_PAIR_ADDRESS || '').trim();

const ADMIN_DISCORD_IDS = (process.env.ADMIN_DISCORD_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

const DISCORD_PUBLIC_USERS_LIMIT = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

function isValidSolanaAddress(s) {
  if (!s || typeof s !== 'string') return false;
  const t = s.trim();
  if (t.length < 32 || t.length > 44) return false;
  const base58 = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58.test(t);
}

if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
  console.warn('Missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET. Set them in .env to enable Discord login.');
}

app.use(function requireProductionSessionSecret(req, res, next) {
  if (process.env.NODE_ENV !== 'production') return next();
  if (SESSION_SECRET !== DEFAULT_SESSION_SECRET) return next();
  /** Stateless JSON used for Team avatars — allow through so previews work even if SESSION_SECRET is unset (cookies remain unsafe until fixed). */
  if ((req.path || '').replace(/\/+$/, '') === '/api/discord/public-users') return next();
  console.error('Production misconfigured: set SESSION_SECRET in environment (Vercel Project Settings).');
  res.status(503).type('text/plain').send('Server misconfigured: set SESSION_SECRET');
});

app.use(cookieParser());
app.use(
  cookieSession({
    name: 'ugly_ape_squad_session',
    keys: [SESSION_SECRET],
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
);

app.get(/^\/raffles(\/.*)?$/, function (req, res) {
  res.redirect(302, '/');
});

app.use(express.static(path.join(__dirname)));

// Avoid 404 for favicon (browsers request it automatically)
app.get('/favicon.ico', function (req, res) {
  res.status(204).end();
});

// ——— Image proxy (same-origin NFT images to avoid cross-site cookies / CORS) ———
const PROXY_IMAGE_HOSTS = [
  'shdw-drive.genesysgo.net',
  'ipfs.dweb.link',
  'cloudflare-ipfs.com',
  'dweb.link',
  'ipfs.io',
  'gateway.pinata.cloud',
  'mypinata.cloud',
  'pinata.cloud',
  'arweave.net',
  'www.arweave.net',
  'cf-ipfs.com',
  'nftstorage.link',
  'ipfs.nftstorage.link',
  'gateway.pinit.io',
  'pinit.io',
  'we-assets.pinit.io',
  'atomicsnfts.com',
  'storage.googleapis.com',
  'ibb.co',
  'img.hi-hi.vip',
  '888jup.com',
  'hi-hi.vip',
  'mara1837891738.com',
  'gateway.irys.xyz',
  'irys.xyz',
];
const PROXY_IMAGE_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const PROXY_IMAGE_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

app.get('/api/proxy-image', async function (req, res) {
  const raw = (req.query.url && String(req.query.url).trim()) || '';
  if (!raw) return res.status(400).send('Missing url');
  let parsed;
  try {
    parsed = new URL(raw);
  } catch (e) {
    return res.status(400).send('Invalid url');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return res.status(400).send('Invalid protocol');
  const host = parsed.hostname.toLowerCase();
  const allowed = PROXY_IMAGE_HOSTS.some(function (h) {
    return host === h || host.endsWith('.' + h);
  });
  if (!allowed) return res.status(403).send('Host not allowed');
  try {
    const imgRes = await axios.get(raw, {
      responseType: 'arraybuffer',
      maxContentLength: PROXY_IMAGE_MAX_SIZE,
      timeout: 15000,
      validateStatus: function (s) { return s === 200; },
      headers: {
        Accept: 'image/*,*/*',
        'User-Agent': PROXY_IMAGE_USER_AGENT,
      },
    });
    let type = (imgRes.headers['content-type'] || '').split(';')[0].trim();
    if (!/^image\//i.test(type)) {
      const pathLower = parsed.pathname.toLowerCase();
      if (/\.(png|jpe?g|gif|webp|svg|ico)(\?|$)/i.test(pathLower)) type = 'image/png';
      else return res.status(415).send('Not an image');
    }
    if (!type) type = 'image/png';
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Type', type);
    res.send(imgRes.data);
  } catch (e) {
    if (e.response?.status) return res.status(e.response.status).send('Upstream error');
    res.status(502).send('Proxy error');
  }
});

// Merch packs: SPA route — same shell + dashboard
app.get('/merch-packs', function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ——— Solana RPC proxy (for NFT transfer in browser; public RPC returns 403 from browser) ———
app.post('/api/solana-rpc', express.json(), async function (req, res) {
  if (!HELIUS_API_KEY) return res.status(503).json({ jsonrpc: '2.0', error: { code: -32603, message: 'RPC not configured' }, id: req.body?.id ?? null });
  const body = req.body;
  if (!body || typeof body !== 'object') return res.status(400).json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid request' }, id: null });
  try {
    const rpcRes = await axios.post(
      `${HELIUS_RPC}/?api-key=${HELIUS_API_KEY}`,
      body,
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000, validateStatus: () => true }
    );
    res.setHeader('Content-Type', 'application/json');
    res.status(rpcRes.status).send(rpcRes.data);
  } catch (e) {
    res.status(502).json({ jsonrpc: '2.0', error: { code: -32603, message: e.message || 'RPC proxy error' }, id: body.id ?? null });
  }
});

// ——— Discord OAuth: start ———
app.get('/api/discord/auth', function (req, res) {
  if (!DISCORD_CLIENT_ID) {
    return res.redirect('/?discord=not_configured');
  }
  const state = Math.random().toString(36).slice(2);
  req.session.discordState = state;
  const qs = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: discordRedirectUri(req),
    response_type: 'code',
    scope: SCOPES,
    state: state,
  });
  res.setHeader('Cache-Control', 'no-store');
  res.redirect(302, DISCORD_AUTH_URL + '?' + qs.toString());
});

// ——— Discord OAuth: callback ———
app.get('/api/discord/callback', async function (req, res) {
  const { code, state } = req.query;
  const savedState = req.session.discordState;

  if (!code || state !== savedState) {
    return res.redirect('/?discord=error');
  }
  delete req.session.discordState;

  if (!DISCORD_CLIENT_SECRET) {
    return res.redirect('/?discord=error');
  }

  try {
    const tokenRes = await axios.post(
      DISCORD_TOKEN_URL,
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: discordRedirectUri(req),
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        validateStatus: () => true,
      }
    );

    if (tokenRes.status !== 200 || !tokenRes.data.access_token) {
      console.warn('Discord token exchange failed', tokenRes.status, tokenRes.data);
      return res.redirect('/?discord=error');
    }

    const userRes = await axios.get(DISCORD_USER_URL, {
      headers: { Authorization: 'Bearer ' + tokenRes.data.access_token },
      validateStatus: () => true,
    });

    if (userRes.status !== 200 || !userRes.data.id) {
      return res.redirect('/?discord=error');
    }

    const user = userRes.data;
    req.session.discord = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator === '0' ? '' : user.discriminator,
      avatar: user.avatar,
      global_name: user.global_name || user.username,
    };
    if (db.upsertUser) {
      db.upsertUser(user.id, user.global_name || user.username, user.avatar).catch((e) =>
        console.warn('DB upsert user:', e.message)
      );
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(302, '/?discord=connected');
  } catch (err) {
    console.warn('Discord callback error', err.message);
    return res.redirect('/?discord=error');
  }
});

// ——— Current Discord user ———
app.get('/api/discord/me', function (req, res) {
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Vary', 'Cookie');
  if (!req.session || !req.session.discord) {
    return res.json({ connected: false });
  }
  res.json({ connected: true, user: req.session.discord });
});

function discordCdnAvatarUrl(discordUser) {
  const id = String(discordUser.id);
  if (discordUser.avatar) {
    const ext = discordUser.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${id}/${discordUser.avatar}.${ext}?size=256`;
  }
  try {
    const idx = Number((BigInt(id) >> 22n) % 6n);
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
  } catch (e) {
    return 'https://cdn.discordapp.com/embed/avatars/0.png';
  }
}

function publicDiscordUserPayload(d) {
  const gn = d.global_name && String(d.global_name).trim();
  const displayName = gn || d.username || 'Member';
  return {
    id: String(d.id),
    username: d.username,
    global_name: d.global_name || null,
    displayName,
    avatarUrl: discordCdnAvatarUrl(d),
  };
}

// GET ?ids=discordUserId,discordUserId — for Team cards (server must have DISCORD_BOT_TOKEN)
app.get('/api/discord/public-users', DISCORD_PUBLIC_USERS_LIMIT, async function (req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  const idsParam = (req.query.ids || '').trim();
  if (!idsParam) {
    return res.json({ users: [], configured: Boolean(DISCORD_BOT_TOKEN) });
  }
  const raw = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 25);
  const ids = raw.filter((id) => /^\d{17,20}$/.test(id));
  if (!DISCORD_BOT_TOKEN) {
    return res.json({
      users: [],
      configured: false,
    });
  }
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const r = await axios.get(`${DISCORD_API_V10}/users/${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
          timeout: 8000,
          validateStatus: () => true,
        });
        if (r.status === 200 && r.data?.id) {
          return publicDiscordUserPayload(r.data);
        }
      } catch (e) {
        console.warn('Discord public-users:', id, e.message);
      }
      return null;
    })
  );
  res.json({ users: results.filter(Boolean), configured: true });
});

// ——— Logout ———
app.post('/api/discord/logout', function (req, res) {
  delete req.session.discord;
  res.json({ ok: true });
});

app.get('/api/discord/logout', function (req, res) {
  delete req.session.discord;
  res.redirect('/');
});

// ——— Wallets: link / list ———
async function handleWalletsLink(req, res) {
  if (!req.session?.discord) return res.status(401).json({ error: 'Not logged in' });
  let wallet = req.method === 'GET' ? (req.query && req.query.wallet) : (req.body && req.body.wallet);
  if (wallet && typeof wallet !== 'string') wallet = null;
  if (!wallet || !wallet.trim()) return res.status(400).json({ error: 'wallet required' });
  const addr = String(wallet).trim();
  if (addr.length < 32 || addr.length > 64) return res.status(400).json({ error: 'Invalid wallet address' });
  if (!db.linkWallet) return res.status(503).json({ error: 'Database not configured' });
  try {
    await db.linkWallet(req.session.discord.id, req.session.discord.global_name || req.session.discord.username, addr);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  res.json({ ok: true });
}
app.get('/api/wallets/link', handleWalletsLink);
app.post('/api/wallets/link', express.json(), handleWalletsLink);

app.get('/api/wallets', async function (req, res) {
  if (!req.session?.discord) return res.status(401).json({ error: 'Not logged in' });
  if (!db.getWalletsByDiscord) return res.json({ wallets: [] });
  const wallets = await db.getWalletsByDiscord(req.session.discord.id);
  res.json({ wallets });
});

app.post('/api/wallets/unlink', express.json(), async function (req, res) {
  if (!req.session?.discord) return res.status(401).json({ error: 'Not logged in' });
  let wallet = req.body && req.body.wallet;
  if (wallet && typeof wallet !== 'string') wallet = null;
  if (!wallet || !String(wallet).trim()) return res.status(400).json({ error: 'wallet required' });
  const addr = String(wallet).trim();
  if (addr.length < 32 || addr.length > 64) return res.status(400).json({ error: 'Invalid wallet address' });
  if (!db.unlinkWallet) return res.status(503).json({ error: 'Database not configured' });
  try {
    const deleted = await db.unlinkWallet(req.session.discord.id, addr);
    if (!deleted) return res.status(404).json({ error: 'Wallet not linked to your account' });
    res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

function isSiteAdmin(discordId) {
  return discordId && ADMIN_DISCORD_IDS.includes(String(discordId));
}

// ——— Merch wait list ———
app.get('/api/wait-list/me', async function (req, res) {
  try {
    if (!req.session?.discord) {
      return res.json({ discordConnected: false, joined: false });
    }
    const row = await db.getWaitListByDiscordId(req.session.discord.id);
    res.json({
      discordConnected: true,
      joined: !!row,
      email: row ? row.email : undefined,
    });
  } catch (e) {
    console.warn('[wait-list/me]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/wait-list/join', express.json(), async function (req, res) {
  try {
    if (!req.session?.discord) return res.status(401).json({ error: 'Log in with Discord first' });
    const email = req.body && req.body.email;
    const result = await db.addWaitListEntry(req.session.discord.id, email);
    if (!result.ok) return res.status(400).json({ error: result.error || 'Could not join' });
    res.json({ ok: true });
  } catch (e) {
    console.warn('[wait-list/join]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/wait-list/all', async function (req, res) {
  try {
    if (!req.session?.discord) return res.status(401).json({ error: 'Not logged in' });
    if (!isSiteAdmin(req.session.discord.id)) return res.status(403).json({ error: 'Admin only' });
    const entries = await db.getAllWaitList();
    res.json({
      entries: (entries || []).map((r) => ({
        discordId: r.discord_id,
        discordUsername: r.discord_username || null,
        email: r.email,
        createdAt: r.created_at,
      })),
    });
  } catch (e) {
    console.warn('[wait-list/all]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/discord/user/:id', async function (req, res) {
  const id = req.params.id;
  if (!id || !DISCORD_BOT_TOKEN) {
    return res.status(503).json({ error: 'Discord bot not configured' });
  }
  try {
    const userRes = await axios.get('https://discord.com/api/v10/users/' + encodeURIComponent(id), {
      headers: { Authorization: 'Bot ' + DISCORD_BOT_TOKEN },
      validateStatus: () => true,
    });
    if (userRes.status !== 200 || !userRes.data.id) {
      if (userRes.status === 401) {
        console.warn('Discord API 401 for user ' + id + ' — check DISCORD_BOT_TOKEN is correct and has no extra spaces/quotes.');
      } else if (userRes.status === 404) {
        console.warn('Discord API 404 for user ' + id + ' — user ID may be wrong or bot cannot see this user.');
      } else {
        console.warn('Discord API returned ' + userRes.status + ' for user ' + id);
      }
      return res.status(404).json({ error: 'User not found' });
    }
    const u = userRes.data;
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({
      id: u.id,
      username: u.username,
      global_name: u.global_name || u.username,
      avatar: u.avatar,
      discriminator: u.discriminator,
    });
  } catch (err) {
    console.warn('Discord user fetch error', err.message);
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// ——— Live prices (Jupiter): SOL + project token USD; cache 60s ———
const SOL_MINT = 'So11111111111111111111111111111111111111112';
let pricesCache = { data: null, ts: 0 };
const PRICES_CACHE_MS = 60 * 1000;

function parseJupiterPrices(data) {
  const out = { solUsd: null, tokenUsd: null, tokenPerSol: null };
  if (!data || typeof data !== 'object') return out;
  const d = typeof data.data === 'object' && data.data !== null ? data.data : data;
  const sol = d[SOL_MINT];
  const tokenData = d[PROJECT_TOKEN_MINT];
  const solP = sol?.price ?? sol?.usdPrice;
  const tokenP = tokenData?.price ?? tokenData?.usdPrice;
  if (solP != null) out.solUsd = Number(solP);
  if (tokenP != null) {
    out.tokenUsd = Number(tokenP);
    if (out.solUsd && out.solUsd > 0) out.tokenPerSol = out.tokenUsd / out.solUsd;
  }
  return out;
}

function mergeDexPairIntoOut(out, row) {
  if (!row || row.priceUsd == null || row.priceUsd === '') return;
  if (out.tokenUsd == null) out.tokenUsd = Number(row.priceUsd);
  const pc = row.priceChange;
  if (pc != null && typeof pc.h24 === 'number') out.priceChange24h = pc.h24;
  if (row.liquidity?.usd != null) out.liquidityUsd = Number(row.liquidity.usd);
  if (row.volume?.h24 != null) out.volume24hUsd = Number(row.volume.h24);
  if (row.marketCap != null) out.marketCapUsd = Number(row.marketCap);
  if (row.fdv != null) out.fdvUsd = Number(row.fdv);
}

function mergeDexLatestPairIntoOut(out, pair) {
  if (!pair || pair.priceUsd == null || pair.priceUsd === '') return;
  if (out.tokenUsd == null) out.tokenUsd = Number(pair.priceUsd);
  const pc = pair.priceChange;
  if (pc != null && typeof pc.h24 === 'number') out.priceChange24h = pc.h24;
  if (pair.liquidity?.usd != null) out.liquidityUsd = Number(pair.liquidity.usd);
  if (pair.volume?.h24 != null) out.volume24hUsd = Number(pair.volume.h24);
  if (pair.marketCap != null) out.marketCapUsd = Number(pair.marketCap);
  if (pair.fdv != null) out.fdvUsd = Number(pair.fdv);
}

app.get('/api/prices', async function (req, res) {
  const now = Date.now();
  if (pricesCache.data && now - pricesCache.ts < PRICES_CACHE_MS) {
    return res.json(pricesCache.data);
  }
  const out = {
    solUsd: null,
    tokenUsd: null,
    tokenPerSol: null,
    priceChange24h: undefined,
    liquidityUsd: undefined,
    volume24hUsd: undefined,
    marketCapUsd: undefined,
    fdvUsd: undefined,
  };
  if (!PROJECT_TOKEN_MINT) {
    pricesCache = { data: out, ts: now };
    return res.json(out);
  }

  // 1) DexScreener by SPL mint (best for tokens only listed on DEX)
  try {
    const dsRes = await axios.get(
      'https://api.dexscreener.com/token-pairs/v1/solana/' + encodeURIComponent(PROJECT_TOKEN_MINT),
      { timeout: 12000, validateStatus: () => true, headers: { Accept: 'application/json' } }
    );
    if (dsRes.status === 200 && Array.isArray(dsRes.data) && dsRes.data.length > 0) {
      const withLiq = dsRes.data.filter(function (p) {
        return p.priceUsd != null && p.priceUsd !== '' && (p.liquidity?.usd ?? 0) > 0;
      });
      const pool = (withLiq.length ? withLiq : dsRes.data).sort(function (a, b) {
        return (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0);
      })[0];
      mergeDexPairIntoOut(out, pool);
    }
  } catch (e) {
    console.warn('DexScreener token-pairs failed', e.message);
  }

  // 2) Optional pair snapshot (e.g. TOKEN_MINT accidentally set to pair id — still show price)
  if (DEXSCREENER_PAIR_ADDRESS && (out.tokenUsd == null || out.marketCapUsd == null)) {
    try {
      const pr = await axios.get(
        'https://api.dexscreener.com/latest/dex/pairs/solana/' + encodeURIComponent(DEXSCREENER_PAIR_ADDRESS),
        { timeout: 12000, validateStatus: () => true, headers: { Accept: 'application/json' } }
      );
      const pair = pr.data?.pair || (Array.isArray(pr.data?.pairs) ? pr.data.pairs[0] : null);
      mergeDexLatestPairIntoOut(out, pair);
    } catch (e) {
      console.warn('DexScreener pair snapshot failed', e.message);
    }
  }

  // 3) Jupiter (SOL + token)
  const ids = [SOL_MINT, PROJECT_TOKEN_MINT].join(',');
  const urls = [
    'https://api.jup.ag/price/v3?ids=' + encodeURIComponent(ids),
    'https://lite-api.jup.ag/price/v3?ids=' + encodeURIComponent(ids),
  ];
  for (const url of urls) {
    try {
      const r = await axios.get(url, {
        timeout: 15000,
        validateStatus: () => true,
        headers: { Accept: 'application/json' },
      });
      if (r.status === 200 && r.data) {
        const parsed = parseJupiterPrices(r.data);
        if (parsed.solUsd != null) out.solUsd = parsed.solUsd;
        if (parsed.tokenUsd != null) out.tokenUsd = parsed.tokenUsd;
        if (parsed.tokenPerSol != null) out.tokenPerSol = parsed.tokenPerSol;
      }
    } catch (e) {
      console.warn('Prices Jupiter fetch failed', url, e.message);
    }
  }

  // 4) SOL/USD without Jupiter (timeouts / rate limits)
  if (out.solUsd == null) {
    try {
      const cg = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
        { timeout: 10000, validateStatus: () => true }
      );
      const v = cg.data?.solana?.usd;
      if (v != null) out.solUsd = Number(v);
    } catch (e) {
      console.warn('SOL USD CoinGecko fallback failed', e.message);
    }
  }

  if (out.solUsd != null && out.solUsd > 0 && out.tokenUsd != null && out.tokenPerSol == null) {
    out.tokenPerSol = out.tokenUsd / out.solUsd;
  }

  pricesCache = { data: out, ts: now };
  res.json(out);
});

// ——— OHLC chart: Birdeye (optional key) → GeckoTerminal pool candles (no key, Dex pair liquidity) ———
const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;
const OHLC_CACHE_MS = 2 * 60 * 1000;
let ohlcCache = { data: null, ts: 0 };

const GECKO_TERMINAL_API = 'https://api.geckoterminal.com/api/v2';
const GECKO_HEADERS = { Accept: 'application/json;version=20230203' };
const GECKO_AGG_BY_TYPE = {
  '1m': 1,
  '3m': 3,
  '5m': 5,
  '15m': 15,
  '30m': 30,
  '1h': 60,
  '2h': 120,
  '4h': 240,
  '6h': 360,
  '8h': 480,
  '12h': 720,
  '1d': 1440,
};

async function geckoPrimaryPoolAddress(tokenMint) {
  const r = await axios.get(
    `${GECKO_TERMINAL_API}/networks/solana/tokens/${encodeURIComponent(tokenMint)}/pools`,
    { headers: GECKO_HEADERS, timeout: 12000, validateStatus: () => true }
  );
  const rows = r.data?.data;
  if (!Array.isArray(rows) || !rows.length) return null;
  const sorted = [...rows].sort(function (a, b) {
    return Number(b.attributes?.reserve_in_usd || 0) - Number(a.attributes?.reserve_in_usd || 0);
  });
  return sorted[0]?.attributes?.address || null;
}

async function fetchGeckoOhlcvUsd(poolAddress, aggregateMinutes) {
  const r = await axios.get(
    `${GECKO_TERMINAL_API}/networks/solana/pools/${encodeURIComponent(poolAddress)}/ohlcv/minute`,
    {
      params: { aggregate: aggregateMinutes, limit: 500 },
      headers: GECKO_HEADERS,
      timeout: 15000,
      validateStatus: () => true,
    }
  );
  const list = r.data?.data?.attributes?.ohlcv_list;
  if (!Array.isArray(list) || !list.length) return [];
  return list.map(function (row) {
    return {
      unix_time: row[0],
      o: row[1],
      h: row[2],
      l: row[3],
      c: row[4],
    };
  });
}

app.get('/api/token-ohlc', async function (req, res) {
  const type = (req.query.type || '15m').toLowerCase().replace(/\s/g, '');
  const validType = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d'].includes(type) ? type : '15m';
  const aggregateMin = GECKO_AGG_BY_TYPE[validType] || 15;

  if (!PROJECT_TOKEN_MINT) {
    return res.json({
      success: false,
      data: { items: [] },
      message: 'Set TOKEN_MINT in server .env to your SPL token mint (not the Dexscreener pair address).',
    });
  }

  const cacheKey = validType;
  if (ohlcCache.data && ohlcCache.type === cacheKey && Date.now() - ohlcCache.ts < OHLC_CACHE_MS) {
    return res.json(ohlcCache.data);
  }

  if (BIRDEYE_API_KEY) {
    const timeTo = Math.floor(Date.now() / 1000);
    const timeFrom = timeTo - 7 * 24 * 60 * 60;
    try {
      const r = await axios.get(
        'https://public-api.birdeye.so/defi/v3/ohlcv',
        {
          params: {
            address: PROJECT_TOKEN_MINT,
            type: validType,
            time_from: timeFrom,
            time_to: timeTo,
            currency: 'usd',
          },
          timeout: 15000,
          validateStatus: () => true,
          headers: {
            'X-API-KEY': BIRDEYE_API_KEY,
            Accept: 'application/json',
          },
        }
      );
      if (r.status === 200 && r.data?.data?.items && r.data.data.items.length > 0) {
        const payload = { success: true, data: { items: r.data.data.items }, message: '' };
        ohlcCache = { data: payload, ts: Date.now(), type: cacheKey };
        return res.json(payload);
      }
    } catch (e) {
      console.warn('Birdeye OHLC failed', e.message);
    }
  }

  try {
    let poolAddr = DEXSCREENER_PAIR_ADDRESS || null;
    if (!poolAddr) poolAddr = await geckoPrimaryPoolAddress(PROJECT_TOKEN_MINT);
    if (!poolAddr) {
      return res.json({
        success: false,
        data: { items: [] },
        message:
          'No OHLC pool found. Set TOKEN_MINT to the SPL token mint (check Dexscreener → pair → base token address), or set DEXSCREENER_PAIR_ADDRESS to the pair id from dexscreener.com/solana/…',
      });
    }
    const items = await fetchGeckoOhlcvUsd(poolAddr, aggregateMin);
    if (!items.length) {
      return res.json({
        success: false,
        data: { items: [] },
        message: 'GeckoTerminal returned no candles for this pool.',
      });
    }
    const payload = { success: true, data: { items }, message: '' };
    ohlcCache = { data: payload, ts: Date.now(), type: cacheKey };
    res.json(payload);
  } catch (e) {
    console.warn('GeckoTerminal OHLC failed', e.message);
    res.json({ success: false, data: { items: [] }, message: e.message || 'OHLC fetch failed' });
  }
});

// ——— Verify: wallet project token balance + NFT count per collection ———
app.get('/api/verify', async function (req, res) {
  const wallet = (req.query.wallet || '').trim();
  if (!wallet) {
    return res.status(400).json({ error: 'Missing wallet' });
  }

  const out = {
    token: 0,
    tokenFormatted: '0',
    col1Count: 0,
    col2Count: 0,
    totalNfts: 0,
  };

  if (!HELIUS_API_KEY) {
    return res.json(out);
  }

  try {
    const mintDecimals = await resolveMintDecimals();

    // 1) Project token balance — Helius getTokenAccounts(owner, mint)
    if (PROJECT_TOKEN_MINT) {
      const tokenRes = await axios.post(
        `${HELIUS_RPC}/?api-key=${HELIUS_API_KEY}`,
        {
          jsonrpc: '2.0',
          id: '1',
          method: 'getTokenAccounts',
          params: {
            owner: wallet,
            mint: PROJECT_TOKEN_MINT,
            limit: 10,
          },
        },
        { timeout: 10000, validateStatus: () => true }
      );
      const tokenAccounts = tokenRes.data?.result?.token_accounts || [];
      let totalRaw = 0;
      for (const acc of tokenAccounts) {
        totalRaw += Number(acc.amount || 0);
      }
      out.token = totalRaw / Math.pow(10, mintDecimals);
      out.tokenFormatted = formatTokenAmount(out.token);
    }

    // 2) NFT counts per collection — getAssetsByOwner, filter by grouping.collection
    const collectionMints = COLLECTIONS.filter((c) => c.collectionMint).map((c) => ({ mint: c.collectionMint, countKey: c.countKey }));
    if (collectionMints.length) {
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const assetsRes = await axios.post(
          `${HELIUS_RPC}/?api-key=${HELIUS_API_KEY}`,
          {
            jsonrpc: '2.0',
            id: '1',
            method: 'getAssetsByOwner',
            params: {
              ownerAddress: wallet,
              page,
              limit: 1000,
              options: { showUnverifiedCollections: true },
            },
          },
          { timeout: 15000, validateStatus: () => true }
        );
        const items = assetsRes.data?.result?.items || [];
        for (const item of items) {
          const group = item.grouping?.find((g) => g.group_key === 'collection');
          const colVal = group?.group_value;
          for (const { mint, countKey } of collectionMints) {
            if (colVal === mint) out[countKey]++;
          }
        }
        hasMore = items.length === 1000;
        page++;
        if (page > 20) break;
      }
      out.totalNfts = COLLECTIONS.reduce((sum, c) => sum + (out[c.countKey] || 0), 0);
    }
  } catch (e) {
    console.warn('Verify failed', e.message);
  }

  res.json(out);
});

// ——— Collections (Magic Eden stats + optional Helius DAS) ———
app.get('/api/collections', async function (req, res) {
  const results = [];
  for (const col of COLLECTIONS) {
    const out = {
      symbol: col.slug,
      name: col.name,
      description: null,
      image: null,
      animationUrl: null,
      supply: null,
      listedCount: null,
      floorPrice: null,
      floorPriceSol: null,
      volumeAll: null,
      volumeAllSol: null,
      avgPrice24hr: null,
      avgPrice24hrSol: null,
      marketplaceUrl: `https://magiceden.io/marketplace/${col.slug}`,
    };

    try {
      const statsRes = await axios.get(`${ME_BASE}/collections/${col.slug}/stats`, {
        timeout: 8000,
        validateStatus: () => true,
      });
      if (statsRes.status === 200 && statsRes.data) {
        const s = statsRes.data;
        out.listedCount = s.listedCount != null ? s.listedCount : null;
        out.floorPrice = s.floorPrice != null ? s.floorPrice : null;
        // ME returns floor in lamports (large integer). If we get a small number, it may already be in SOL.
        const fp = out.floorPrice;
        const floorSol = fp != null
          ? (fp >= 1000 ? fp / LAMPORTS_PER_SOL : Number(fp))
          : null;
        out.floorPriceSol = floorSol != null && !isNaN(floorSol) ? floorSol.toFixed(4) : null;
        out.volumeAll = s.volumeAll != null ? s.volumeAll : null;
        out.volumeAllSol = out.volumeAll != null ? (out.volumeAll / LAMPORTS_PER_SOL).toFixed(2) : null;
        out.avgPrice24hr = s.avgPrice24hr != null ? s.avgPrice24hr : null;
        out.avgPrice24hrSol = out.avgPrice24hr != null ? (out.avgPrice24hr / LAMPORTS_PER_SOL).toFixed(4) : null;
      }
    } catch (e) {
      console.warn('ME stats failed for', col.slug, e.message);
    }

    // Magic Eden: collection metadata (name, description, image) if available
    try {
      const metaRes = await axios.get(`${ME_BASE}/collections/${col.slug}`, {
        timeout: 5000,
        validateStatus: () => true,
      });
      if (metaRes.status === 200 && metaRes.data) {
        const m = metaRes.data;
        if (m.name) out.name = m.name;
        if (m.description) out.description = m.description;
        if (m.image || m.imageURI) out.image = m.image || m.imageURI;
        if (m.animation_url || m.animationUrl) out.animationUrl = m.animation_url || m.animationUrl;
        if (m.totalSupply != null) out.supply = m.totalSupply;
      }
    } catch (e) {
      // ignore
    }

    // Helius DAS: derive supply by counting all NFTs in the collection when we have collection mint
    if (HELIUS_API_KEY && col.collectionMint) {
      try {
        let page = 1;
        let totalItems = 0;
        let hasMore = true;
        while (hasMore) {
          const heliusRes = await axios.post(
            `${HELIUS_RPC}/?api-key=${HELIUS_API_KEY}`,
            {
              jsonrpc: '2.0',
              id: '1',
              method: 'getAssetsByGroup',
              params: {
                groupKey: 'collection',
                groupValue: col.collectionMint,
                page,
                limit: 1000,
                options: {
                  showCollectionMetadata: page === 1,
                },
              },
            },
            { timeout: 10000, validateStatus: () => true }
          );
          const data = heliusRes.data?.result;
          const items = data?.items || [];
          totalItems += items.length;
          if (page === 1) {
            const meta = items[0]?.grouping?.find((g) => g.group_key === 'collection')?.collection_metadata;
            if (meta) {
              if (meta.name) out.name = meta.name;
              if (meta.description) out.description = meta.description;
              if (meta.image) out.image = meta.image;
            }
          }
          hasMore = items.length === 1000;
          page += 1;
          if (page > 50) break;
        }
        if (totalItems > 0) out.supply = totalItems;
      } catch (e) {
        console.warn('Helius DAS failed for', col.slug, e.message);
      }
    }

    // Marketplace APIs often append " - Collection"; always use configured display names for tiles.
    out.name = col.name;
    out.description = null;

    results.push(out);
  }
  res.json({ collections: results });
});

// ——— Holders table (token + NFT by collection), filter/sort by total | token | col1 | col2 | nfts ———
// Decode owner (32 bytes) + amount (8 bytes LE) from getProgramAccounts dataSlice(32, 40)
function decodeTokenAccountOwnerAndAmount(dataBase64) {
  if (!dataBase64) return null;
  try {
    const buf = Buffer.from(dataBase64, 'base64');
    if (buf.length < 40) return null;
    const owner = bs58.encode(buf.slice(0, 32));
    const amount = buf.readBigUInt64LE(32);
    return { owner, amount: Number(amount) };
  } catch (e) {
    return null;
  }
}

app.get('/api/holders', async function (req, res) {
  const sortBy = (req.query.sort || 'total').toLowerCase();
  const sortNorm = String(sortBy || '').toLowerCase();
  const validSort = ['total', 'token', 'col1', 'col2', 'nfts'].includes(sortNorm) ? sortNorm : 'total';

  const holderMap = new Map(); // wallet -> counts keyed by COLLECTIONS[].countKey

  function getOrCreate(wallet) {
    if (!holderMap.has(wallet)) {
      const base = { wallet, tokenBalance: 0, tokenBalanceFormatted: '0' };
      COLLECTIONS.forEach((c) => { base[c.countKey] = 0; });
      holderMap.set(wallet, base);
    }
    return holderMap.get(wallet);
  }

  const mintDecimals = await resolveMintDecimals();

  // 1) Token holders (project token) via getProgramAccounts — all SPL token accounts for this mint
  if (HELIUS_API_KEY && PROJECT_TOKEN_MINT) {
    try {
      const gpaRes = await axios.post(
        `${HELIUS_RPC}/?api-key=${HELIUS_API_KEY}`,
        {
          jsonrpc: '2.0',
          id: '1',
          method: 'getProgramAccounts',
          params: [
            TOKEN_PROGRAM_ID,
            {
              encoding: 'base64',
              commitment: 'confirmed',
              filters: [
                { dataSize: 165 },
                { memcmp: { offset: 0, bytes: PROJECT_TOKEN_MINT } },
              ],
              dataSlice: { offset: 32, length: 40 },
            },
          ],
        },
        { timeout: 30000, validateStatus: () => true }
      );
      const accounts = gpaRes.data?.result || [];
      const decimals = mintDecimals;
      for (const item of accounts) {
        const data = item.account?.data;
        if (!data) continue;
        const decoded = decodeTokenAccountOwnerAndAmount(Array.isArray(data) ? data[0] : data);
        if (!decoded || decoded.amount === 0) continue;
        const raw = decoded.amount / Math.pow(10, decimals);
        const h = getOrCreate(decoded.owner);
        h.tokenBalance += raw;
        h.tokenBalanceFormatted = formatTokenAmount(h.tokenBalance);
      }
    } catch (e) {
      console.warn('Holders token fetch failed', e.message);
    }

    // 2) NFT owner counts per collection (getAssetsByGroup paginate, aggregate by owner)
    for (let c = 0; c < COLLECTIONS.length; c++) {
      const col = COLLECTIONS[c];
      const key = col.countKey;
      if (!key || !col.collectionMint) {
        if (!col.collectionMint) {
          console.warn('Holders: collection on-chain mint not set for', col.slug, '— NFT counts for this collection will be 0.');
        }
        continue;
      }
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        try {
          const dasRes = await axios.post(
            `${HELIUS_RPC}/?api-key=${HELIUS_API_KEY}`,
            {
              jsonrpc: '2.0',
              id: '1',
              method: 'getAssetsByGroup',
              params: {
                groupKey: 'collection',
                groupValue: col.collectionMint,
                page,
                limit: 1000,
              },
            },
            { timeout: 15000, validateStatus: () => true }
          );
          const items = dasRes.data?.result?.items || [];
          for (const item of items) {
            const owner = item.ownership?.owner;
            if (owner) {
              const h = getOrCreate(owner);
              h[key] = (h[key] || 0) + 1;
            }
          }
          hasMore = items.length === 1000;
          page++;
          if (page > 50) break;
        } catch (e) {
          console.warn('Holders NFT fetch failed for', col.slug, e.message);
          hasMore = false;
        }
      }
    }
  }

  function totalNftsFromHolder(h) {
    return COLLECTIONS.reduce((sum, c) => sum + (h[c.countKey] || 0), 0);
  }

  let list = Array.from(holderMap.values()).map(function (h) {
    const totalNfts = totalNftsFromHolder(h);
    return {
      wallet: h.wallet,
      tokenBalance: h.tokenBalance,
      tokenBalanceFormatted: h.tokenBalanceFormatted,
      ...COLLECTIONS.reduce((o, c) => { o[c.countKey] = h[c.countKey] || 0; return o; }, {}),
      totalNfts,
      totalScore: (h.tokenBalance || 0) / 1e6 + totalNfts * 10,
    };
  });

  // Aggregate by Discord when DB is available: one row per Discord user, show Discord name
  if (db.getAllWalletToDiscord && db.getDiscordUsernames) {
    const walletToDiscord = await db.getAllWalletToDiscord();
    const discordIds = [...new Set(walletToDiscord.values())];
    const discordNames = await db.getDiscordUsernames(discordIds);
    const byDiscord = new Map(); // key (discordId or wallet) -> merged holder
    for (const h of list) {
      const dId = walletToDiscord.get(h.wallet.toLowerCase());
      const key = dId || h.wallet;
      const existing = byDiscord.get(key);
      if (existing) {
        existing.tokenBalance += h.tokenBalance;
        existing.tokenBalanceFormatted = formatTokenAmount(existing.tokenBalance);
        COLLECTIONS.forEach((c) => { existing[c.countKey] = (existing[c.countKey] || 0) + (h[c.countKey] || 0); });
        existing.totalNfts = totalNftsFromHolder(existing);
        existing.totalScore = existing.tokenBalance / 1e6 + existing.totalNfts * 10;
        existing.walletCount = (existing.walletCount || 1) + 1;
      } else {
        const totalNfts = totalNftsFromHolder(h);
        byDiscord.set(key, {
          displayName: dId ? (discordNames.get(dId) || 'Discord user') : h.wallet.slice(0, 4) + '…' + h.wallet.slice(-4),
          /** First wallet in merge order — Solscan link; aggregated balances include all linked wallets. */
          wallet: h.wallet,
          discordId: dId || null,
          walletCount: 1,
          tokenBalance: h.tokenBalance,
          tokenBalanceFormatted: h.tokenBalanceFormatted,
          ...COLLECTIONS.reduce((o, c) => { o[c.countKey] = h[c.countKey] || 0; return o; }, {}),
          totalNfts,
          totalScore: (h.tokenBalance || 0) / 1e6 + totalNfts * 10,
        });
      }
    }
    list = Array.from(byDiscord.values()).map(function (o) {
      const { displayName, wallet, discordId, walletCount, ...rest } = o;
      return { displayName, wallet, discordId, walletCount: walletCount || 1, ...rest };
    });
  } else {
    list = list.map(function (h) {
      return {
        displayName: h.wallet.slice(0, 4) + '…' + h.wallet.slice(-4),
        wallet: h.wallet,
        discordId: null,
        walletCount: 1,
        ...h,
      };
    });
  }

  // Filter out wallets with no holdings for the selected view
  if (validSort === 'token') {
    list = list.filter((h) => (h.tokenBalance || 0) > 0);
  } else if (validSort === 'col1') {
    list = list.filter((h) => (h.col1Count || 0) > 0);
  } else if (validSort === 'col2') {
    list = list.filter((h) => (h.col2Count || 0) > 0);
  } else {
    list = list.filter((h) => (h.tokenBalance || 0) > 0 || (h.totalNfts || 0) > 0);
  }

  if (validSort === 'token') list.sort((a, b) => b.tokenBalance - a.tokenBalance);
  else if (validSort === 'col1') list.sort((a, b) => (b.col1Count || 0) - (a.col1Count || 0));
  else if (validSort === 'col2') list.sort((a, b) => (b.col2Count || 0) - (a.col2Count || 0));
  else if (validSort === 'nfts') list.sort((a, b) => b.totalNfts - a.totalNfts);
  else list.sort((a, b) => b.totalScore - a.totalScore);

  res.json({ holders: list, sort: validSort });
});

function formatTokenAmount(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

// On Vercel, do not listen; the app is used by api/[[...path]].js
if (process.env.VERCEL !== '1') {
  app.listen(PORT, function () {
    console.log('Ugly Ape Squad server at http://localhost:' + PORT);
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
      console.log('Discord login disabled: set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in .env');
    } else {
      console.log('Discord OAuth: add each production redirect to Dev Portal, e.g.', BASE_URL + '/api/discord/callback', '(local), plus https://YOUR-DOMAIN/api/discord/callback');
    }
  });
}

module.exports = app;
