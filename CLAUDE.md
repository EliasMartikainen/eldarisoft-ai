# Eldarisoft AI – projekti

## Mitä tämä on
AI-chatbotti-demo osoitteessa ai.eldarisoft.fi.
Vanilla HTML/CSS/JS frontend + Cloudflare Worker backend + Anthropic Claude API.

## Kansiorakenne
- `index.html` – chat UI (koko sivu, ChatGPT-tyylinen layout)
- `styles.css` – kaikki tyylit
- `app.js` – chat-logiikka, API-kutsut
- `assets/logo.png` – Eldarisoft-logo
- `worker/index.js` – Cloudflare Worker (API-proxy + rate limiting)

## Worker URL
https://eldarisoft-ai.elias-martikainen99.workers.dev

## Tärkeät muistettavat
- API-avain on VAIN Cloudflare-ympäristömuuttujissa, ei koskaan frontendissä
- Logo on inlinoitu base64:nä app.js:ssä (LOGO_SRC-muuttuja) – jos logo vaihtuu, aja python-skripti joka muuntaa sen valkoiseksi läpinäkyvätaustaiseksi PNG:ksi
- Rate limit: 20 viestiä/IP/tunti (Worker)
- Spending cap: $5/kk Anthropic Consolessa

## Värit & brändi
- Pääsininen: #2563EB
- Tumma tausta (dark): #0f1117
- Fontti: Plus Jakarta Sans

## Deploy
GitHub Pages tai AWS S3+CloudFront → ai.eldarisoft.fi (CNAME Route 53)