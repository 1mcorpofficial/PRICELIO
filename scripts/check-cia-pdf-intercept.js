/**
 * Intercept Čia Market network requests to find PDF download URL
 */
const { chromium } = require('playwright-core');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--headless=new'],
  });
  try {
    const page = await browser.newPage({ userAgent: UA });

    // Intercept all requests
    const requests = [];
    page.on('request', req => {
      const url = req.url();
      if (url.includes('.pdf') || url.includes('leidinys') || url.includes('download') || url.includes('file')) {
        requests.push(url);
      }
    });
    page.on('response', async res => {
      const url = res.url();
      if (url.includes('.pdf') || url.includes('leidinys') || url.includes('download')) {
        requests.push('RESPONSE: ' + url);
      }
    });

    await page.goto('https://www.ciamarket.lt/akciju-leidinys', { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(2000);

    // Get all links on page
    const allLinks = await page.evaluate(() => {
      return [...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => h.length > 10);
    });

    console.log('All links on page:');
    allLinks.forEach(l => console.log(' ', l));

    console.log('\nIntercepted PDF/download requests:');
    requests.forEach(r => console.log(' ', r));

    // Try clicking the first download link
    console.log('\nTrying to click download button...');
    try {
      await page.click('a:has-text("Parsisiųsti"), a:has-text("PDF"), a[download], a[href*=".pdf"]', { timeout: 3000 });
      await page.waitForTimeout(2000);
      console.log('Clicked. New requests:', requests.filter(r => r.includes('pdf')));
    } catch(e) {
      console.log('No clickable download link found:', e.message.substring(0, 100));
    }

    // Get page HTML for inspection
    const html = await page.content();
    const pdfRefs = html.match(/https?:\/\/[^\s"'<>]*\.pdf[^\s"'<>]*/gi) || [];
    const relPdfRefs = html.match(/(?:href|src)="([^"]*\.pdf[^"]*)"/gi) || [];
    console.log('\nPDF refs in HTML:', [...pdfRefs, ...relPdfRefs].slice(0, 10));

  } finally {
    await browser.close();
  }
}

main().catch(e => console.error('Fatal:', e.message));
