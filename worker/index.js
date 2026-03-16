/**
 * Eldarisoft AI - Cloudflare Worker
 * Default: JSON response. Add ?stream=true for SSE streaming.
 */

const ALLOWED_ORIGINS = [
  'https://ai.eldarisoft.fi',
  'https://eldarisoft.fi',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.includes(origin);
}

function getCorsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin' : isAllowedOrigin(origin) ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

const rateLimitMap = new Map();
const RATE_LIMIT   = 100;
const WINDOW_MS    = 60 * 60 * 1000;

function checkRateLimit(ip) {
  const now   = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + WINDOW_MS };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + WINDOW_MS; }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  rateLimitMap.set(ip, entry);
  return true;
}

function jsonError(msg, status, corsHeaders = {}) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const SYSTEM_PROMPT =
  'Olet Eldarisoft AI -demo. Olet ammattimainen, ystävällinen ja hyödyllinen AI-assistentti. ' +
  'Vastaa suomeksi, paitsi jos käyttäjä kirjoittaa muulla kielellä.';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const CORS_HEADERS = getCorsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (!isAllowedOrigin(origin)) {
      return new Response('Forbidden', { status: 403 });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/chat') return jsonError('Not found', 404, CORS_HEADERS);
    if (request.method !== 'POST') return jsonError('Method not allowed', 405, CORS_HEADERS);

    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    if (!checkRateLimit(ip)) {
      return jsonError('Liian monta viestiä – odota hetki. (429)', 429, CORS_HEADERS);
    }

    let body;
    try { body = await request.json(); }
    catch { return jsonError('Invalid JSON', 400, CORS_HEADERS); }

    const { message, history = [] } = body;
    if (!message || typeof message !== 'string') return jsonError('message required', 400, CORS_HEADERS);

    const messages = [
      ...history.filter(h => h.role && h.content).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const wantStream = url.searchParams.get('stream') === 'true';

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method : 'POST',
      headers: {
        'x-api-key'        : env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type'     : 'application/json',
      },
      body: JSON.stringify({
        model     : 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        stream    : wantStream,
        system    : SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      return jsonError('AI-palvelu ei vastannut. Yritä uudelleen.', 502, CORS_HEADERS);
    }

    if (wantStream) {
      const { readable, writable } = new TransformStream();
      anthropicRes.body.pipeTo(writable);
      return new Response(readable, {
        status : 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type'         : 'text/event-stream',
          'Cache-Control'        : 'no-cache',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    // Default: odota koko vastaus, palauta JSON
    const data  = await anthropicRes.json();
    const reply = data.content?.[0]?.text ?? '';
    return new Response(JSON.stringify({ reply }), {
      status : 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  },
};
