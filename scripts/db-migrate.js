/**
 * Create database tables if they don't exist.
 * Run: npm run db:migrate
 * Users + wallets (wait_list is created on first merch wait-list use).
 */
require('dotenv').config();
const { Client } = require('pg');
const { normalizeDatabaseUrl } = require('../db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  discord_id TEXT PRIMARY KEY,
  discord_username TEXT NOT NULL,
  discord_avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  wallet_address TEXT PRIMARY KEY,
  discord_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
  connected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_discord ON wallets(discord_id);
`;

async function run() {
  let url = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!url) {
    console.error('DATABASE_URL not set. Add it to .env');
    process.exit(1);
  }
  // Use verify-full to avoid pg SSL deprecation warning (handled in normalizeDatabaseUrl)
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await client.query(SCHEMA);
    console.log('Migration complete.');
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
