/**
 * Explore FlipHTML5 API for Čia Market leaflet
 * Book ID: xntmg/dpdc (found from network intercept)
 */
const axios = require('axios');

const BASE = 'https://online.fliphtml5.com/xntmg/dpdc';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function tryUrl(url) {
  try {
    const r = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 10000, validateStatus: () => true });
    const body = typeof r.data === 'object' ? JSON.stringify(r.data).substring(0, 500) : String(r.data).substring(0, 500);
    console.log('[' + r.status + ']', url.substring(40));
    if (r.status === 200) console.log('  ->', body.substring(0, 300));
    return r;
  } catch(e) {
    console.log('[ERR]', url.substring(40), e.message.substring(0, 60));
    return null;
  }
}

async function main() {
  console.log('=== FlipHTML5 API for Čia Market leaflet ===\n');

  // Standard FlipHTML5 API endpoints
  const endpoints = [
    BASE + '/config.json',
    BASE + '/index.html',
    BASE + '/files/',
    BASE + '/files/page.json',
    BASE + '/mobile/',
    BASE + '/mobile/config.js',
    BASE + '/js/flipbook.js',
  ];

  for (const url of endpoints) {
    await tryUrl(url);
    await new Promise(r => setTimeout(r, 300));
  }

  // The known image URL pattern: /files/large/HASH.webp
  // Let's check if there's a manifest or index
  console.log('\n=== Known page images ===');
  const knownPages = [
    'https://online.fliphtml5.com/xntmg/dpdc/files/large/a06c3ae1114a80855138c3c0c547c70f.webp',
    'https://online.fliphtml5.com/xntmg/dpdc/files/large/1d92988c8eb250b2f513f6e8abc9cfa6.webp',
    'https://online.fliphtml5.com/xntmg/dpdc/files/large/da65d6f60fa6ae2af7fa9211213465d2.webp',
    'https://online.fliphtml5.com/xntmg/dpdc/files/thumb/20c1446f790e347a2747e404d952aca8.webp',
  ];
  for (const url of knownPages) {
    const r = await axios.get(url, { headers: { 'User-Agent': UA, 'Referer': 'https://www.ciamarket.lt/' }, timeout: 10000, responseType: 'arraybuffer', validateStatus: () => true });
    console.log(url.split('/').pop().substring(0, 20), '->', r.status, r.data.byteLength + ' bytes');
  }

  // Try to get the book configuration from fliphtml5
  console.log('\n=== Trying FlipHTML5 book config ===');
  const configUrls = [
    'https://online.fliphtml5.com/xntmg/dpdc/files/large/',
    'https://online.fliphtml5.com/xntmg/dpdc/files/mobile/',
    'https://online.fliphtml5.com/xntmg/dpdc/page-data.json',
    'https://api.fliphtml5.com/book/xntmg/dpdc',
  ];
  for (const url of configUrls) {
    await tryUrl(url);
    await new Promise(r => setTimeout(r, 300));
  }

  // Check if we can get the HTML of the flipbook which might list all pages
  console.log('\n=== Main flipbook page ===');
  const mainR = await axios.get(BASE + '/', { headers: { 'User-Agent': UA }, timeout: 15000, validateStatus: () => true });
  const html = mainR.data + '';
  console.log('Size:', html.length);
  // Find all image URLs
  const imgUrls = html.match(/https?:\/\/online\.fliphtml5\.com\/[^\s"'<>]+\.webp/g) || [];
  const jsonData = html.match(/"pages":\s*\[[^\]]{10,1000}\]/g) || [];
  const pageCount = html.match(/"pageCount":\s*(\d+)/) || html.match(/"totalPage":\s*(\d+)/);
  console.log('Image URLs found:', imgUrls.slice(0, 5));
  console.log('Page data:', jsonData.slice(0, 2));
  console.log('Page count match:', pageCount);
  // Check for JSON in scripts
  const scripts = html.match(/<script[^>]*>([^<]{100,3000})<\/script>/g) || [];
  scripts.slice(0, 5).forEach((s, i) => {
    if (s.includes('page') || s.includes('image') || s.includes('thumb')) {
      console.log('Script[' + i + ']:', s.substring(0, 300));
    }
  });
}

main().catch(e => console.error('Fatal:', e.message));
