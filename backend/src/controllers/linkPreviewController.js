const https = require('https');
const http = require('http');
const { URL } = require('url');

function fetchHtml(urlStr, maxBytes = 80000) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(urlStr);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 6000
      };

      const req = client.request(options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          try {
            const redirectUrl = new URL(res.headers.location, urlStr).toString();
            return resolve(fetchHtml(redirectUrl, maxBytes));
          } catch {
            return resolve('');
          }
        }

        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => {
          data += chunk;
          if (data.length > maxBytes) {
            req.destroy();
            resolve(data);
          }
        });
        res.on('end', () => resolve(data));
        res.on('error', reject);
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

function extractMeta(html, targetUrl) {
  const getMeta = (property) => {
    const regex1 = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i');
    const regex2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, 'i');
    const m1 = html.match(regex1);
    if (m1) return m1[1].trim();
    const m2 = html.match(regex2);
    if (m2) return m2[1].trim();
    return null;
  };

  const getTitle = () => {
    const og = getMeta('og:title') || getMeta('twitter:title');
    if (og) return og;
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return match ? match[1].trim() : null;
  };

  let image = getMeta('og:image') || getMeta('twitter:image');
  if (image && !image.startsWith('http')) {
    try {
      image = new URL(image, targetUrl).toString();
    } catch {}
  }

  return {
    title: getTitle(),
    description: getMeta('og:description') || getMeta('twitter:description') || getMeta('description'),
    image,
    siteName: getMeta('og:site_name'),
    url: getMeta('og:url') || targetUrl
  };
}

exports.getLinkPreview = async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'Invalid URL protocol' });
    }

    const hostname = parsed.hostname;
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) {
      return res.status(403).json({ error: 'Private URLs not allowed' });
    }

    const html = await fetchHtml(url);
    const meta = extractMeta(html, url);
    return res.json({ ok: true, ...meta });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch preview', detail: err.message });
  }
};
