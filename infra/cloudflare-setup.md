# QCart — Cloudflare CDN Setup

Setting up Cloudflare in front of QCart provides: free CDN, DDoS protection, SSL termination,
edge caching, and optional rate-limiting Workers.

## Prerequisites

- Domain `qcart.gmtmall.com` (or your custom domain) registered at any registrar
- Cloudflare account (free tier)

## Step 1: Add domain to Cloudflare

1. Sign in to Cloudflare → **Add a Site** → enter `gmtmall.com`
2. Cloudflare scans existing DNS records (may take a minute)
3. Choose **Free** plan

## Step 2: Configure DNS

Add these DNS records in Cloudflare (orange cloud ☁️ = proxied):

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `qcart` | `31.97.158.10` | ☁️ Proxied |
| CNAME | `www` | `qcart.gmtmall.com` | ☁️ Proxied (optional) |

> **Important:** After changing nameservers (step 3), ALL traffic flows through
> Cloudflare. Caddy on the VPS will see Cloudflare IPs, not real visitor IPs.
> See Step 5 for restoring real IPs.

## Step 3: Update nameservers

1. Cloudflare shows two nameservers (e.g., `dana.ns.cloudflare.com`, `gael.ns.cloudflare.com`)
2. Go to your domain registrar → update nameservers to Cloudflare's
3. Propagation: 5–30 minutes

## Step 4: SSL/TLS settings

Cloudflare Dashboard → **SSL/TLS**:
- **Full (strict)** — requires a valid cert on the origin (Caddy auto-provisions one)
- **Always Use HTTPS** → ON
- **Minimum TLS Version** → 1.2
- **Automatic HTTPS Rewrites** → ON

## Step 5: Restore real visitor IPs

Caddy needs to see the real visitor IP (not Cloudflare's). Two options:

### Option A: Cloudflare Trusted IPs (recommended for single-origin)

No Caddy changes needed if `reverse_proxy` is the only directive. Caddy
automatically trusts Cloudflare IPs when the proxy protocol header is present.

### Option B: Caddy `trusted_proxies` directive

If you add `get_ip` or rate-limiting, update `qcart.Caddyfile`:

```
qcart.gmtmall.com {
    # Trust Cloudflare proxy IPs
    trusted_proxies static 173.245.48.0/20 103.21.244.0/22 103.22.200.0/22 \
                          103.31.4.0/22 141.101.64.0/18 108.162.192.0/18 \
                          190.93.240.0/20 188.114.96.0/20 197.234.240.0/22 \
                          198.41.128.0/17 162.158.0.0/15 104.16.0.0/13 \
                          104.24.0.0/14 172.64.0.0/13 131.0.72.0/22

    encode gzip zstd
    reverse_proxy qcart-frontend:80

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }
}
```

## Step 6: Page Rules (Free plan — 3 rules)

Create these in Cloudflare Dashboard → **Rules** → **Page Rules**:

| # | URL | Setting | Value |
|---|-----|---------|-------|
| 1 | `qcart.gmtmall.com/assets/*` | Cache Level: **Cache Everything** | Edge TTL: **1 year** |
| 2 | `qcart.gmtmall.com/uploads/*` | Cache Level: **Cache Everything** | Edge TTL: **7 days** |
| 3 | `qcart.gmtmall.com/api/*` | Cache Level: **Bypass** | — |

## Step 7: Cache Rules (modern alternative to Page Rules)

Cloudflare Dashboard → **Rules** → **Cache Rules** (recommended over Page Rules):

**Rule 1 — Static assets:**
- When: `Hostname equals qcart.gmtmall.com` AND `URI Path starts with /assets/`
- Cache: **Eligible for cache**, Edge TTL = **1 year**, Origin TTL = **respected**
- Note: origin sets `Cache-Control: public, immutable, max-age=31536000` for `/assets/`

**Rule 2 — Uploaded images:**
- When: `Hostname equals qcart.gmtmall.com` AND `URI Path starts with /uploads/`
- Cache: **Eligible for cache**, Edge TTL = **7 days**, Origin TTL = **respected**

**Rule 3 — API / dynamic:**
- When: `Hostname equals qcart.gmtmall.com` AND `URI Path starts with /api/`
- Cache: **Bypass cache**

**Rule 4 — Homepage:**
- When: `Hostname equals qcart.gmtmall.com` AND `URI Path equals /`
- Cache: **Eligible for cache**, Edge TTL = **5 minutes**
- Serve stale while revalidating

## Step 8: Security (WAF)

Cloudflare Dashboard → **Security** → **WAF**:

- **Rate limiting rules** (free: 1 rule):
  - `(/api/auth/login)` — 5 requests per minute — Block for 10 minutes
  - `(/api/orders)` — 30 requests per minute — Block for 5 minutes (when Pro plan)

- **Bot Fight Mode**: ON (challenges疑似 bots)

## Step 9: (Optional) Cloudflare Workers for rate limiting

Create a Worker at `https://dash.cloudflare.com/?to=workers`:

```js
// Rate-limit API by IP using KV
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) return fetch(request)

    const ip = request.headers.get('CF-Connecting-IP')
    const key = `rl:${ip}:${url.pathname.split('/')[3]}` // per-endpoint
    const { value, ttl } = await env.KV.getWithMetadata(key)

    if (value && parseInt(value) > 100) {
      return new Response('Too Many Requests', { status: 429 })
    }

    await env.KV.put(key, String(parseInt(value || '0') + 1), { expirationTtl: 60 })
    return fetch(request)
  }
}
```

## Step 10: Verify

After Cloudflare is live:
```bash
curl -sI https://qcart.gmtmall.com/assets/index-*.js | findstr "cf-cache-status"
# Expected: cf-cache-status: HIT  (after first request)
```

Check the Cloudflare dashboard → **Analytics** → **Performance** for cache hit ratio.
Target: >90% cache hit rate for `/assets/` and `/uploads/`.

## Rollback

To disable Cloudflare, set the DNS record to **DNS only** (grey cloud) in Cloudflare.
Traffic goes directly to the VPS. Then update nameservers back at your registrar.
