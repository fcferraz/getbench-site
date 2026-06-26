const store = new Map();
const WINDOW_MS = 60_000;
// ponytail: in-memory store, resets on cold start — effective only in local dev.
// Replace with KV-backed implementation when Vercel KV is provisioned.
const MAX_REQUESTS = 10;

const ALLOWED_ORIGINS = [
  'https://www.buskai.net',
  'https://buskai.net',
  'http://localhost:4321',
];

function checkOrigin(request) {
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';
  const allowed = ALLOWED_ORIGINS.some(h => origin.startsWith(h) || referer.startsWith(h));
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}

function getIP(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function memRateLimit(request, maxRequests) {
  const ip = getIP(request);
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.reset) {
    store.set(ip, { count: 1, reset: now + WINDOW_MS });
    return null;
  }

  entry.count += 1;

  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.reset - now) / 1000);
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(maxRequests),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(entry.reset / 1000)),
      },
    });
  }

  return null;
}

export async function rateLimit(request, maxRequests = MAX_REQUESTS) {
  const originBlocked = checkOrigin(request);
  if (originBlocked) return originBlocked;
  return memRateLimit(request, maxRequests);
}
