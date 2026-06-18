const { execSync } = require('child_process');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const cacheDir = process.env.PUPPETEER_CACHE_DIR || path.join(projectRoot, '.cache', 'puppeteer');

process.env.PUPPETEER_CACHE_DIR = cacheDir;

console.log(`Installing Puppeteer Chrome into ${cacheDir}`);

try {
  execSync('npx puppeteer browsers install chrome', {
    stdio: 'inherit',
    env: process.env,
    cwd: projectRoot,
  });
} catch (error) {
  console.error('Failed to install Puppeteer Chrome:', error.message);
  process.exit(1);
}
