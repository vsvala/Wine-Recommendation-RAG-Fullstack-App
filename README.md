# Wine Recommendation RAG System

A full-stack AI wine recommendation app that accepts natural language queries and returns ranked wine suggestions with sommelier-style explanations.

**Example query:** _"bold red wine for steak under $30"_

> Built with [Claude Code](https://claude.ai/code) — Anthropic's AI coding assistant.

---

## Architecture

```
┌─────────────────────────────────────────┐
│           User (Browser)                │
│     "bold red wine for steak $30"       │
└─────────────────┬───────────────────────┘
                  │ POST /recommend
┌─────────────────▼───────────────────────┐
│          React Frontend (Vite)          │
│   Search form → Wine cards + blurbs     │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Express Backend (Node.js)       │
│                                         │
│  ┌─────────────┐    ┌────────────────┐  │
│  │ Redis Cache │◄───►   /recommend   │  │
│  │  (1h TTL)   │    │    pipeline    │  │
│  └─────────────┘    └───────┬────────┘  │
└────────────────────────────-│───────────┘
                              │
          ┌───────────────────▼───────────────────┐
          │        OpenAI Embeddings API           │
          │      text-embedding-3-small            │
          │   query string → 1536-dim vector       │
          └───────────────────┬───────────────────┘
                              │
          ┌───────────────────▼───────────────────┐
          │          FAISS Vector DB               │
          │   cosine similarity search             │
          │   returns top-20 wine candidates       │
          └───────────────────┬───────────────────┘
                              │
          ┌───────────────────▼───────────────────┐
          │           Hybrid Ranker                │
          │  0.35 semantic + 0.20 price_fit        │
          │  + 0.10 rating + 0.10 popularity       │
          │  → top-5 wines                         │
          └───────────────────┬───────────────────┘
                              │
          ┌───────────────────▼───────────────────┐
          │       GPT-4o-mini Explainer            │
          │  1 sommelier blurb per wine            │
          │  single API call for all 5 wines       │
          └───────────────────────────────────────┘
```

---

## How Embeddings Work

Embeddings are the core of the RAG pipeline — they make semantic search possible.

```
"bold red wine for steak"
        │
        ▼
OpenAI text-embedding-3-small
        │
        ▼
[0.021, -0.134, 0.887, ...]   ← 1536 numbers (a vector)
```

**The idea:** every piece of text — whether a user query or a wine description — gets converted into a list of 1536 numbers. Texts that mean similar things end up as vectors that point in the same direction in that 1536-dimensional space.

**At index build time** (`build_index.py`):
- Each wine's `description` field is sent to the Embeddings API
- The returned vector is stored in the FAISS index
- This runs once and is saved to disk

**At query time** (`search.py`):
- The user's query is sent to the same Embeddings API
- The returned query vector is compared against all stored wine vectors
- FAISS returns the 20 wines whose vectors are most similar (cosine similarity)

**Why cosine similarity?** It measures the angle between vectors, not their length — so "cheap red" and "affordable red wine" land near the same wines even though the words differ.

The model used here is `text-embedding-3-small` — cheap (~$0.02 per million tokens), fast, and good enough for wine descriptions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8 |
| Backend | Node.js, Express 5 |
| Vector DB | FAISS (via Python) |
| Embeddings | OpenAI `text-embedding-3-small` |
| LLM | OpenAI `gpt-4o-mini` |
| Cache | Redis (ioredis) |
| Dataset | Kaggle Wine Reviews (130k wines) |

---

## Project Structure

```
Wine-Recommendation-RAG-Fullstack-App/
├── back/
│   ├── index.js                  # Express server entry point
│   ├── routes/
│   │   └── recommend.js          # POST /recommend — main pipeline
│   ├── services/
│   │   ├── vectorSearch.js       # Calls search.py via child_process
│   │   ├── ranker.js             # Hybrid scoring engine
│   │   ├── explainer.js          # GPT-4o-mini explanation layer
│   │   └── cache.js              # Redis get/set wrapper
│   ├── scripts/
│   │   ├── filter_data.py        # Step 1: filter raw dataset
│   │   ├── build_index.py        # Step 2: embed wines + build FAISS index
│   │   └── search.py             # Step 3: query-time vector search
│   └── .env                      # API keys and config (not committed)
├── front/
│   └── src/
│       ├── App.jsx               # Search form + wine result cards
│       ├── App.css               # Component styles
│       └── index.css             # Design tokens, global reset
├── data/
│   ├── winemag-data-130k-v2.json # Raw Kaggle dataset (not committed)
│   ├── wines_filtered.json       # Filtered subset (not committed)
│   ├── wines.index               # FAISS index (not committed)
│   └── wines_ids.json            # Wine metadata for search results (not committed)
└── README.md
```

---

## Prerequisites

- Node.js 18+
- Python 3.9+
- Redis (running locally on default port 6379)
- OpenAI API key with billing enabled

**Python dependencies:**
```bash
pip install faiss-cpu openai numpy
```

---

## Setup

### 1. Clone and install

```bash
# Backend
cd back
npm install

# Frontend
cd ../front
npm install
```

### 2. Configure environment

Create `back/.env`:

```env
OPENAI_API_KEY=sk-...
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3001
```

### 3. Prepare the dataset

Download the [Kaggle Wine Reviews dataset](https://www.kaggle.com/datasets/zynicide/wine-reviews) and place `winemag-data-130k-v2.json` in `data/`.

**Filter the dataset** (run once):
```bash
python3 back/scripts/filter_data.py
```

This produces `data/wines_filtered.json`.

> By default filters to wines with `points >= 98` (~116 wines) for low-cost testing.
> Change the threshold to `93` in `filter_data.py` for the full ~11.5k dataset.

**Build the FAISS index** (run once, costs ~$0.01–0.02 in OpenAI credits for the full dataset):
```bash
OPENAI_API_KEY=<your-key> python3 back/scripts/build_index.py
```

This produces `data/wines.index` and `data/wines_ids.json`.

### 4. Start Redis

```bash
redis-server
```

---

## Running the App

```bash
# Terminal 1 — backend (port 3001)
cd back
npm run dev

# Terminal 2 — frontend (port 5173)
cd front
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## API

### `POST /recommend`

Request:
```json
{ "query": "light white wine for seafood under $25" }
```

Response:
```json
{
  "wines": [
    {
      "title": "...",
      "variety": "Chardonnay",
      "country": "France",
      "price": 22,
      "points": 98,
      "score": 0.7341,
      "explanation": "A crisp, mineral-driven Chardonnay that pairs perfectly with delicate seafood."
    }
  ],
  "fromCache": false
}
```

### `GET /health`

Returns `{ "status": "ok" }`.

---

## Hybrid Ranking

Results are re-ranked after vector search using a weighted formula:

```
final_score =
  0.35 × semantic_similarity   (cosine similarity from FAISS)
  0.20 × price_fit             (how well price matches budget hint in query)
  0.10 × rating                (normalised points 93–100)
  0.10 × popularity            (inverse price proxy)
  0.25 × food_pairing_score    (reserved — not yet implemented)
```

Budget hints are parsed from natural language: _"under $30"_, _"30€"_, _"30 dollars"_.

---

## Roadmap

- [ ] Upgrade to full 11.5k wine dataset — change `points >= 98` to `>= 93` in `filter_data.py` and rebuild the index
- [ ] Implement food pairing score (0.25 weight currently unused in ranker)
- [ ] Streaming LLM responses for faster perceived latency
- [ ] Filter UI — dropdowns for country, variety, price range
- [ ] Docker Compose for one-command startup
- [ ] Unit tests for ranker scoring logic
- [ ] Error boundary in React for graceful frontend failures
- [ ] Rate limiting on the `/recommend` endpoint
