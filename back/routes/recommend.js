/**
 * routes/recommend.js — POST /recommend
 *
 * Request body:  { "query": "red wine for steak under 20€" }
 * Response:      { "wines": [ { title, variety, country, price, points, score, explanation } ] }
 *
 * Pipeline:
 *   1. Check Redis cache — return immediately if hit
 *   2. Run Python search.py to get top-K semantically similar wines
 *   3. Re-rank using hybrid scoring (ranker service)
 *   4. Generate per-wine blurb using OpenAI (explainer service)
 *   5. Store result in Redis cache
 *   6. Return to client
 */

import { Router } from 'express';
import { getCached, setCache } from '../services/cache.js';
import { search } from '../services/vectorSearch.js';
import { rank } from '../services/ranker.js';
import { explain } from '../services/explainer.js';

const router = Router();

router.post('/', async (req, res) => {
  const { query } = req.body;

  // Validate: must be a non-empty string under 500 characters.
  // Without the length cap, a malicious user could send a huge string
  // directly to the OpenAI Embeddings API and inflate costs.
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({ error: 'query is required' });
  }
  if (query.length > 500) {
    return res.status(400).json({ error: 'query must be 500 characters or fewer' });
  }

  // Collapse internal whitespace so "red  wine" and "red wine" hit the same cache key
  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, ' ');

  // 1. Cache check
  const cached = await getCached(normalizedQuery);
  if (cached) {
    return res.json({ wines: cached, fromCache: true });
  }

  // 2. Vector search — returns top-20 candidates with semantic_score
  const candidates = await search(normalizedQuery);

  // 3. Hybrid re-ranking — returns top-5 sorted by final score
  const ranked = rank(candidates, normalizedQuery);

  // 4. Generate one short blurb per wine
  const wines = await explain(ranked, normalizedQuery);

  // 5. Cache result
  await setCache(normalizedQuery, wines);

  return res.json({ wines, fromCache: false });
});

export default router;
