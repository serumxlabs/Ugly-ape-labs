/**
 * Replace {{SITE_URL}} in public/index.html (after copy-static) for Open Graph / Twitter URLs.
 * Leaves repo-root index.html unchanged so {{SITE_URL}} placeholders stay in source control.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const destPath = path.join(root, 'public', 'index.html');

const siteUrl = (
  process.env.SITE_URL ||
  process.env.BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  'https://your-domain.vercel.app'
).replace(/\/$/, '');

if (!fs.existsSync(destPath)) {
  console.error('inject-og: public/index.html not found. Run copy-static before inject-og.');
  process.exit(1);
}

let html = fs.readFileSync(destPath, 'utf8');
html = html.replace(/\{\{SITE_URL\}\}/g, siteUrl);
fs.writeFileSync(destPath, html, 'utf8');

console.log('OG meta (public/index.html): SITE_URL =', siteUrl);
