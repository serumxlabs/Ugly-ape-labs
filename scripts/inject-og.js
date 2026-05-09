/**
 * Replace {{SITE_URL}} in public/index.html (after copy-static) for Open Graph / Twitter / Discord embeds.
 * Leaves repo-root index.html unchanged so {{SITE_URL}} placeholders stay in source control.
 *
 * URL priority: SITE_URL → BASE_URL → VERCEL_PROJECT_PRODUCTION_URL → VERCEL_URL
 * Vercel's VERCEL_PROJECT_PRODUCTION_URL is the stable production hostname (custom domain or *.vercel.app)
 * and is set even on preview builds — good for consistent og:image URLs.
 * Enable: Vercel → Project → Settings → Environment Variables → "System Environment Variables".
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const destPath = path.join(root, 'public', 'index.html');

function httpsOrigin(input) {
  if (input == null || input === '') return null;
  const s = String(input).trim();
  if (!s) return null;
  if (/^https:\/\//i.test(s)) return s.replace(/\/$/, '');
  if (/^http:\/\//i.test(s)) return s.replace(/^http:/i, 'https:').replace(/\/$/, '');
  return `https://${s.replace(/^\/+/, '')}`.replace(/\/$/, '');
}

const siteUrl =
  httpsOrigin(process.env.SITE_URL) ||
  httpsOrigin(process.env.BASE_URL) ||
  httpsOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
  httpsOrigin(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  'https://your-domain.vercel.app';

if (!fs.existsSync(destPath)) {
  console.error('inject-og: public/index.html not found. Run copy-static before inject-og.');
  process.exit(1);
}

let html = fs.readFileSync(destPath, 'utf8');
html = html.replace(/\{\{SITE_URL\}\}/g, siteUrl);
fs.writeFileSync(destPath, html, 'utf8');

console.log('OG meta (public/index.html): SITE_URL =', siteUrl);
