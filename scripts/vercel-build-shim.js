/**
 * Vercel often invokes the project buildCommand multiple times in one deployment
 * (e.g. while bundling each serverless route). copy-static + inject-og only need to run once
 * per workspace within a short window.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const marker = path.join(root, 'node_modules', '.vercel-static-build-done');
const WINDOW_MS = 4 * 60 * 1000;

function runBuild() {
  execSync('node scripts/copy-static.js && node scripts/inject-og.js', { cwd: root, stdio: 'inherit' });
  try {
    fs.mkdirSync(path.dirname(marker), { recursive: true });
    fs.writeFileSync(marker, String(Date.now()));
  } catch (_) {}
}

if (!process.env.VERCEL) {
  runBuild();
  process.exit(0);
}

try {
  if (fs.existsSync(marker)) {
    const t = parseInt(fs.readFileSync(marker, 'utf8').trim(), 10);
    if (!Number.isNaN(t) && Date.now() - t < WINDOW_MS) {
      console.log('vercel-build: skipping duplicate run (same workspace, <4m since last)');
      process.exit(0);
    }
  }
} catch (_) {}

runBuild();
