const fs = require('fs');
const path = require('path');

const DEFAULT_MARGIN = {
  top: '0px',
  right: '0px',
  bottom: '0px',
  left: '0px',
};

let puppeteerPromise;

async function getPuppeteer() {
  if (!puppeteerPromise) {
    puppeteerPromise = import('puppeteer').then((mod) => mod.default || mod);
  }
  return puppeteerPromise;
}

const generatePdf = async (file, options = {}) => {
  const puppeteer = await getPuppeteer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
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
