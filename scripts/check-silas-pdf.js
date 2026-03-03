/**
 * Test PDF parsing for Šilas weekly leaflet
 */
const axios = require('axios');
const pdfParse = require('pdf-parse');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function main() {
  // First find the latest PDF URL
  const page = await axios.get('https://www.silas.lt/akcijos', {
    headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip, deflate, br' },
    timeout: 15000, decompress: true,
  });

  const pdfMatch = page.data.match(/https?:\/\/[^\s"'<>]+\.pdf/i);
  const pdfUrl = pdfMatch ? pdfMatch[0] : null;
  console.log('Found PDF URL:', pdfUrl);

  if (!pdfUrl) { console.log('No PDF found'); return; }

  // Download PDF
  console.log('Downloading PDF...');
  const pdfResp = await axios.get(pdfUrl, {
    headers: { 'User-Agent': UA },
    responseType: 'arraybuffer',
    timeout: 30000,
  });
  console.log('PDF size:', pdfResp.data.byteLength, 'bytes');

  // Parse PDF
  const data = await pdfParse(Buffer.from(pdfResp.data));
  console.log('Pages:', data.numpages);
  console.log('Text length:', data.text.length);
  console.log('\n=== Extracted text (first 3000 chars) ===');
  console.log(data.text.substring(0, 3000));

  // Look for price patterns
  const prices = data.text.match(/\d+[,.]\d{2}\s*€|€\s*\d+[,.]\d{2}/g);
  console.log('\n=== Prices found ===', prices ? prices.length : 0);
  if (prices) console.log(prices.slice(0, 20));

  // Look for product name patterns near prices
  const lines = data.text.split('\n').filter(l => l.trim().length > 2);
  console.log('\n=== Lines with prices ===');
  lines.filter(l => /\d+[,.]\d{2}/.test(l)).slice(0, 20).forEach(l => console.log(' ', l.trim()));
}

main().catch(e => console.error('Fatal:', e.message));
