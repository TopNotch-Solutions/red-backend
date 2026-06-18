const fs = require('fs');
const path = require('path');

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
  '/snap/bin/chromium',
];

let puppeteerPromise;

async function getPuppeteer() {
  if (!puppeteerPromise) {
    puppeteerPromise = import('puppeteer').then((mod) => mod.default || mod);
  }
  return puppeteerPromise;
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

  const systemChrome = SYSTEM_CHROME_PATHS.find((chromePath) => fs.existsSync(chromePath));
  if (systemChrome) {
    return systemChrome;
  }

  throw new Error(
    'Chrome/Chromium not found. Run "npx puppeteer browsers install chrome" on the server, ' +
    'install system Chromium (e.g. apt install chromium-browser), or set PUPPETEER_EXECUTABLE_PATH.'
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
