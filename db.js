/**
 * Database helpers for users, wallets.
 * Uses Neon PostgreSQL.
 */
const { Pool } = require('pg');

let pool = null;

/** Neon / Postgres: strip channel_binding (node-pg issues); normalize sslmode for pg. */
function normalizeDatabaseUrl(url) {
  if (!url || typeof url !== 'string') return url;
  try {
    const u = new URL(url);
    u.searchParams.delete('channel_binding');
    let out = u.toString();
    if (/sslmode=(require|prefer|verify-ca)/i.test(out)) {
      out = out.replace(/sslmode=(require|prefer|verify-ca)/i, 'sslmode=verify-full');
    }
    return out;
  } catch (_) {
    let s = url.replace(/[&?]channel_binding=[^&]*/gi, '');
    s = s.replace(/\?&/g, '?').replace(/[?&]$/g, '');
    if (s.includes('sslmode=require') || s.includes('sslmode=prefer') || s.includes('sslmode=verify-ca')) {
      s = s.replace(/sslmode=(require|prefer|verify-ca)/i, 'sslmode=verify-full');
    }
    return s;
  }
}

function getPool() {
  if (!pool) {
    let url = normalizeDatabaseUrl(process.env.DATABASE_URL);
    if (!url) return null;
    pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: true } });
  }
  return pool;
}

async function upsertUser(discordId, discordUsername, discordAvatar) {
  const p = getPool();
  if (!p) return null;
  await p.query(
    `INSERT INTO users (discord_id, discord_username, discord_avatar, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (discord_id) DO UPDATE SET
       discord_username = EXCLUDED.discord_username,
       discord_avatar = EXCLUDED.discord_avatar,
       updated_at = NOW()`,
    [discordId, discordUsername || '', discordAvatar || null]
  );
  return { discordId, discordUsername, discordAvatar };
}

async function linkWallet(discordId, discordUsername, walletAddress) {
  const p = getPool();
  if (!p) return null;
  await upsertUser(discordId, discordUsername, null);
  await p.query(
    `INSERT INTO wallets (wallet_address, discord_id)
     VALUES ($1, $2)
     ON CONFLICT (wallet_address) DO UPDATE SET discord_id = EXCLUDED.discord_id`,
    [walletAddress.toLowerCase(), discordId]
  );
  return { discordId, walletAddress };
}

async function getWalletsByDiscord(discordId) {
  const p = getPool();
  if (!p) return [];
  const res = await p.query(
    'SELECT wallet_address FROM wallets WHERE discord_id = $1',
    [discordId]
  );
  return (res.rows || []).map((r) => r.wallet_address);
}

/** Remove one wallet row only if it belongs to this Discord user. Returns number of rows deleted (0 or 1). */
async function unlinkWallet(discordId, walletAddress) {
  const p = getPool();
  if (!p) return 0;
  const addr = String(walletAddress || '').trim();
  if (!addr) return 0;
  const res = await p.query(
    'DELETE FROM wallets WHERE LOWER(wallet_address) = LOWER($1) AND discord_id = $2',
    [addr, discordId]
  );
  return res.rowCount || 0;
}

async function getDiscordByWallet(walletAddress) {
  const p = getPool();
  if (!p) return null;
  const res = await p.query(
    'SELECT discord_id FROM wallets WHERE wallet_address = $1',
    [walletAddress.toLowerCase()]
  );
  return res.rows?.[0]?.discord_id || null;
}

async function getAllWalletToDiscord() {
  const p = getPool();
  if (!p) return new Map();
  const res = await p.query('SELECT wallet_address, discord_id FROM wallets');
  const m = new Map();
  (res.rows || []).forEach((r) => m.set(r.wallet_address.toLowerCase(), r.discord_id));
  return m;
}

async function getDiscordUsernames(discordIds) {
  if (!discordIds || discordIds.length === 0) return new Map();
  const p = getPool();
  if (!p) return new Map();
  const placeholders = discordIds.map((_, i) => '$' + (i + 1)).join(',');
  const res = await p.query(
    `SELECT discord_id, discord_username FROM users WHERE discord_id IN (${placeholders})`,
    discordIds
  );
  const m = new Map();
  (res.rows || []).forEach((r) => m.set(r.discord_id, r.discord_username));
  return m;
}

// ——— Merch wait list (Discord + email) ———
async function ensureWaitListTable() {
  const p = getPool();
  if (!p) return false;
  await p.query(`
    CREATE TABLE IF NOT EXISTS wait_list (
      discord_id VARCHAR(32) PRIMARY KEY,
      email VARCHAR(320) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  return true;
}

function normalizeWaitListEmail(email) {
  const em = String(email || '').trim().toLowerCase();
  if (!em || em.length > 320) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return null;
  return em;
}

async function addWaitListEntry(discordId, email) {
  const em = normalizeWaitListEmail(email);
  if (!em) return { ok: false, error: 'Invalid email' };
  const ready = await ensureWaitListTable();
  if (!ready) return { ok: false, error: 'Database unavailable' };
  const p = getPool();
  await p.query(
    `INSERT INTO wait_list (discord_id, email, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (discord_id) DO UPDATE SET
       email = EXCLUDED.email,
       updated_at = NOW()`,
    [String(discordId), em]
  );
  return { ok: true };
}

async function getWaitListByDiscordId(discordId) {
  const ready = await ensureWaitListTable();
  if (!ready) return null;
  const p = getPool();
  const res = await p.query(
    'SELECT discord_id, email, created_at, updated_at FROM wait_list WHERE discord_id = $1',
    [String(discordId)]
  );
  return res.rows?.[0] || null;
}

async function getAllWaitList() {
  const ready = await ensureWaitListTable();
  if (!ready) return [];
  const p = getPool();
  const res = await p.query(
    `SELECT w.discord_id, w.email, w.created_at, w.updated_at, u.discord_username
     FROM wait_list w
     LEFT JOIN users u ON u.discord_id = w.discord_id
     ORDER BY w.created_at ASC`
  );
  return res.rows || [];
}

module.exports = {
  getPool,
  normalizeDatabaseUrl,
  upsertUser,
  linkWallet,
  unlinkWallet,
  getWalletsByDiscord,
  getDiscordByWallet,
  getAllWalletToDiscord,
  getDiscordUsernames,
  ensureWaitListTable,
  addWaitListEntry,
  getWaitListByDiscordId,
  getAllWaitList,
};
