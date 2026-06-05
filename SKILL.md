---
name: run-wine-rag
description: run, start, launch, screenshot, verify, test the wine RAG recommendation app — fullstack Express backend and React/Vite frontend
---

This is a fullstack web app: Express backend on port 3001, React/Vite frontend on port 5173. The backend exposes `POST /recommend` which is the core RAG pipeline. Drive it with `curl` for API testing or `chromium-cli` for UI flows.

## Prerequisites

Node.js 18+, npm. A `back/.env` file with `OPENAI_API_KEY` set. Redis is optional — the backend falls back gracefully when unavailable.

## Build

```bash
cd back && npm install
cd ../front && npm install
```

## Run (agent path)

**1. Start the backend** in the background:

```bash
cd back && npm run dev &
sleep 2
```

**2. Smoke-test the API directly with curl:**

```bash
curl -s -X POST http://localhost:3001/recommend \
  -H "Content-Type: application/json" \
  -d '{"query": "red wine for steak under 20 euros"}' | head -c 500
```

Expect a JSON response with a `recommendations` array and an `explanation` string.

**3. Start the frontend** (needed for UI verification):

```bash
cd front && npm run dev &
sleep 3
```

**4. Drive the UI with chromium-cli:**

```bash
chromium-cli navigate http://localhost:5173
chromium-cli screenshot --path=/tmp/wine-home.png
# Type a query and submit
chromium-cli eval "document.querySelector('input, textarea').value = 'red wine for steak'"
chromium-cli eval "document.querySelector('form, button[type=submit], button').click()"
sleep 5
chromium-cli screenshot --path=/tmp/wine-results.png
```

Screenshots land at `/tmp/wine-home.png` and `/tmp/wine-results.png`.

## Run (human path)

Two terminals:

```bash
# Terminal 1
cd back && npm run dev

# Terminal 2
cd front && npm run dev
```

Open `http://localhost:5173`. Type a query like "red wine for steak under 20€" and submit.

## Stop

```bash
kill $(lsof -ti:3001) $(lsof -ti:5173) 2>/dev/null
```

## Lint

```bash
cd front && npm run lint
```

## Build for production

```bash
cd front && npm run build
```

## Key entry points

- `back/index.js` — Express server entry point, port 3001
- `back/routes/recommend.js` — `POST /recommend` route (RAG pipeline entry)
- `back/services/vectorSearch.js` — FAISS vector search
- `back/services/ranker.js` — hybrid ranking (semantic + price + rating)
- `back/services/explainer.js` — LLM explanation via OpenAI
- `back/services/cache.js` — Redis caching layer
- `front/src/App.jsx` — React root, calls `http://localhost:3001/recommend`

## Gotchas

- **Port is 3001, not 3000.** The README and old docs may say 3000 — the actual `index.js` defaults to `process.env.PORT || 3001`.
- **No vite proxy configured.** The frontend calls `http://localhost:3001` directly (hardcoded in `App.jsx:4`). CORS must be allowed — it is, via the `cors` middleware in `back/index.js`.
- **FAISS index builds on first run.** The first request after a fresh install will be slow while the Python scripts build the index from `data/winemag-data-130k-v2.json`.
- **Redis failure is silent.** If Redis is not running, requests still work — caching is skipped, not crashed.
