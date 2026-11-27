// MyRecipes "recipe reader": a tiny Cloudflare Worker (free plan) that fetches a recipe web page
// on the app's behalf, because browsers block reading other sites directly (CORS).
// It returns only the recipe data found on the page, never the raw page, and only answers the app's own origin.
//
// Deploy: Cloudflare dashboard > Workers & Pages > Create > "Hello World" Worker > Edit code,
// paste this whole file, Deploy. Then give the app the worker's https://….workers.dev address.

const ALLOWED_ORIGINS = ['https://updownupdown.github.io', 'http://localhost:5173', 'http://localhost:4173'];
const MAX_BYTES = 3_000_000;

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      Vary: 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const reply = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (!ALLOWED_ORIGINS.includes(origin)) return reply({ error: 'Not allowed' }, 403);
    const target = new URL(request.url).searchParams.get('url');
    let url;
    try { url = new URL(target); } catch { return reply({ error: 'Missing or invalid url' }, 400); }
    if (!/^https?:$/.test(url.protocol)) return reply({ error: 'Only web links are supported' }, 400);

    let res;
    try {
      res = await fetch(url.toString(), {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Mobile Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en,fr;q=0.8',
        },
        cf: { cacheTtl: 3600 },
      });
    } catch {
      return reply({ error: 'Could not reach that site' }, 502);
    }
    if (!res.ok) return reply({ error: `That site answered ${res.status}` }, 502);
    const html = (await res.text()).slice(0, MAX_BYTES);
    return reply(extract(html, res.url || url.toString()));
  },
};

export function extract(html, finalUrl) {
  const jsonld = [];
  const re = /<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) jsonld.push(m[1].trim());
  const meta = (p) => {
    const r = new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]*content=["']([^"']*)["']`, 'i');
    const r2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${p}["']`, 'i');
    return (html.match(r) || html.match(r2) || [])[1];
  };
  const title = meta('og:title') || (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '';
  // Plain-text fallback for pages without structured data: keep the main content, drop markup.
  const body = (html.match(/<(article|main)[\s\S]*?<\/\1>/i) || [html])[0];
  const text = body
    .replace(/<(script|style|noscript|svg|nav|header|footer|aside|form)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|\/p|\/li|\/h\d|\/div|\/tr)[^>]*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
    .slice(0, 40000);
  return { url: finalUrl, title, jsonld, text };
}
