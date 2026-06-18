const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');
const PUPPETEER_CACHE_DIR =
  process.env.PUPPETEER_CACHE_DIR || path.join(PROJECT_ROOT, '.cache', 'puppeteer');

if (!process.env.PUPPETEER_CACHE_DIR) {
  process.env.PUPPETEER_CACHE_DIR = PUPPETEER_CACHE_DIR;
}

const DEFAULT_MARGIN = {
  top: '0px',
  right: '0px',
  bottom: '0px',
  left: '0px',
};

const SYSTEM_CHROME_PATHS = [
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/lib64/chromium-browser/chromium-browser',
  '/usr/lib64/chromium/chromium',
  '/snap/bin/chromium',
];

let puppeteerPromise;

async function getPuppeteer() {
  if (!puppeteerPromise) {
    puppeteerPromise = import('puppeteer').then((mod) => mod.default || mod);
  }
  return puppeteerPromise;
}

function findChromeInCache(cacheDir) {
  const chromeRoot = path.join(cacheDir, 'chrome');
  if (!fs.existsSync(chromeRoot)) {
    return null;
  }

  const builds = fs.readdirSync(chromeRoot).sort().reverse();
  for (const build of builds) {
    const candidates = [
      path.join(chromeRoot, build, 'chrome-linux64', 'chrome'),
      path.join(chromeRoot, build, 'chrome-linux', 'chrome'),
    ];

    const match = candidates.find((candidate) => fs.existsSync(candidate));
    if (match) {
      return match;
    }
  }

  return null;
}

function resolveExecutablePath(puppeteer) {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    const configured = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (!fs.existsSync(configured)) {
      throw new Error(`PUPPETEER_EXECUTABLE_PATH does not exist: ${configured}`);
    }
    return configured;
  }

  try {
    const bundled = puppeteer.executablePath();
    if (bundled && fs.existsSync(bundled)) {
      return bundled;
    }
  } catch {
    // Puppeteer's bundled Chrome is not installed.
  }

  const cachedChrome = findChromeInCache(PUPPETEER_CACHE_DIR);
  if (cachedChrome) {
    return cachedChrome;
  }

  const systemChrome = SYSTEM_CHROME_PATHS.find((chromePath) => fs.existsSync(chromePath));
  if (systemChrome) {
    return systemChrome;
  }

  throw new Error(
    `Chrome/Chromium not found. Cache dir: ${PUPPETEER_CACHE_DIR}. ` +
    'From the project root run: npm run install:chrome ' +
    '(or on RHEL: sudo dnf install -y chromium && set PUPPETEER_EXECUTABLE_PATH to the binary path).'
  );
}

const generatePdf = async (file, options = {}) => {
  const puppeteer = await getPuppeteer();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: resolveExecutablePath(puppeteer),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();

    if (file.content) {
      await page.setContent(file.content, { waitUntil: 'networkidle0' });
    } else if (file.url) {
      await page.goto(file.url, { waitUntil: 'networkidle0' });
    } else {
      throw new Error('PDF input must include content or url');
    }

    const buffer = await page.pdf({
      format: options.format || 'A4',
      printBackground: options.printBackground ?? true,
      margin: options.margin || DEFAULT_MARGIN,
    });

    if (options.path) {
      await fs.promises.mkdir(path.dirname(options.path), { recursive: true });
      await fs.promises.writeFile(options.path, buffer);
    }

    return buffer;
  } finally {
    await browser.close();
  }
};

module.exports = { generatePdf };
