# Eldarisoft AI

> A production-ready AI chatbot demo built with the Anthropic Claude API and Cloudflare Workers.
>
> **Live:** [ai.eldarisoft.fi](https://ai.eldarisoft.fi)

---

## What it demonstrates

- **Production-grade AI chatbot integration** — real Claude API, not a mock
- **Secure API key handling** — the key lives only in Cloudflare environment variables, never in frontend code
- **Cost protection** — rate limiting + Anthropic spending cap ensures zero surprise bills
- **Conversation memory** — maintains context across up to 10 message pairs
- **Clean, branded UI** — responsive, accessible, works on all modern browsers

---

## Architecture

```
User (browser)
      │
      ▼
ai.eldarisoft.fi   ← HTML / CSS / JS  (GitHub Pages or AWS)
      │
      ▼  POST /chat
Cloudflare Worker  ← validates, rate-limits, proxies
      │
      ▼
Anthropic Claude API  (claude-haiku-4-5 — fastest & cheapest)
```

The Cloudflare Worker acts as a **secure proxy** — the API key is stored as a Cloudflare environment variable and never touches the client.

---

## Tech stack

| Layer       | Technology                    | Cost              |
|-------------|-------------------------------|-------------------|
| Frontend    | Vanilla HTML / CSS / JS       | Free              |
| Hosting     | GitHub Pages or AWS           | Free              |
| Proxy       | Cloudflare Workers            | Free (100k req/day) |
| AI model    | Anthropic Claude Haiku 4.5    | ~$0–2 / month     |
| Domain      | ai.eldarisoft.fi (subdomain)  | Free              |

**Total cost: effectively $0 / month**

---

## Security

| Protection              | Implementation                                              |
|-------------------------|-------------------------------------------------------------|
| API key protection      | Stored in Cloudflare env vars only — never in frontend code |
| Rate limiting           | Max 20 requests per IP per hour (in-memory, Worker-side)    |
| Input validation        | 500-character limit enforced on both frontend and Worker     |
| CORS restriction        | Only allows requests from `ai.eldarisoft.fi`                |
| Spending cap            | $5/month hard limit set in Anthropic Console                |
| History truncation      | Max 10 messages sent to API to keep token costs predictable |

---

## Project structure

```
eldarisoft-ai/
├── index.html          # Chat UI
├── styles.css          # Eldarisoft-branded styles (dark theme)
├── app.js              # Chat logic, API calls to Worker
├── assets/
│   └── logo.png        # (add your logo here)
├── worker/
│   └── index.js        # Cloudflare Worker — the secure proxy
└── README.md
```

---

## Setup guide

### 1. Anthropic API key & spending cap

1. Create an account at [console.anthropic.com](https://console.anthropic.com)
2. Go to **API Keys** → create a key
3. **Immediately** go to **Settings → Billing → Usage limits**
4. Set **Monthly spend limit: $5** and **Alert at: $2**

>  Do this before going live. When the $5 limit is hit, the API stops responding automatically — no surprise invoices.

### 2. Cloudflare Worker

1. Create a free account at [cloudflare.com](https://cloudflare.com)
2. Go to **Workers & Pages** → **Create Worker**
3. Paste the contents of `worker/index.js`
4. Go to **Settings → Variables** and add:
   - `ANTHROPIC_API_KEY` = `sk-ant-...` (your key)
   - `ALLOWED_ORIGIN` = `https://ai.eldarisoft.fi`
5. Deploy — you'll get a `*.workers.dev` URL automatically

### 3. Test the Worker

```bash
curl -X POST https://eldarisoft-ai.YOURNAME.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hei, toimiiko tämä?", "history": []}'
```

Expected response: `{"reply": "..."}`

### 4. Update frontend

In `app.js`, replace the placeholder Worker URL:

```js
const WORKER_URL = 'https://eldarisoft-ai.YOURNAME.workers.dev';
```

### 5. Deploy frontend

**GitHub Pages:**
```bash
git init && git add . && git commit -m "initial"
git branch -M main
git remote add origin https://github.com/YOURNAME/eldarisoft-ai.git
git push -u origin main
# Enable GitHub Pages in repo settings → Pages → source: main / root
```

**AWS (S3 + CloudFront):**
Upload files to S3 bucket with static website hosting enabled, then point CloudFront to it.

### 6. Configure subdomain

In **Route 53** (or your DNS provider), add:

```
Type:  CNAME
Name:  ai
Value: YOURNAME.github.io     ← GitHub Pages
       OR your CloudFront domain
```

> DNS propagation can take up to 24 hours.

---

## Pre-launch checklist

- Normal message works end-to-end
- Long message (500+ chars) is blocked gracefully
- Rate limit activates after 20 rapid messages
- Empty message doesn't send
- Works on mobile (iOS Safari + Android Chrome)
- Works on Safari, Chrome, Firefox
- API key is invisible in browser DevTools (Network tab)
- Spending cap is set in Anthropic Console

---

## Customisation

The system prompt in `worker/index.js` controls the AI's personality and scope.
For a real client deployment, replace it with company-specific instructions:

```js
const SYSTEM_PROMPT = `You are the customer service assistant for ACME Corp.
You help customers with our products: Widget A, Widget B, and Widget C.
...`;
```

The model, token limits, and rate limits are all in one place at the top of `worker/index.js`.

---

## Potential issues

| Problem                   | Solution                                              |
|---------------------------|-------------------------------------------------------|
| CORS error in browser     | Check Worker CORS headers, confirm allowed origin matches exactly |
| API key not working       | Verify Cloudflare environment variables (not wrangler.toml) |
| Subdomain not resolving   | DNS propagation — wait up to 24h                     |
| Worker not responding     | Cloudflare Dashboard → Workers → Logs                |
| AI responds in English    | Add "Vastaa aina suomeksi" to system prompt           |
| High API costs            | Lower `MAX_TOKENS` in Worker (e.g. 150) or switch to a smaller model |

---

## Future ideas

- **Per-client customisation** — URL parameter swaps the system prompt for different demo clients
- **Contact form** — "Want this for your company?" CTA below the chat
- **Streaming responses** — text appears token-by-token (like ChatGPT)
- **Analytics** — message volume, popular questions via Cloudflare Analytics Engine

---

## About Eldarisoft

Eldarisoft builds custom AI solutions for businesses — chatbots, automations, and AI-powered products.

→ [www.eldarisoft.fi](https://www.eldarisoft.fi)
