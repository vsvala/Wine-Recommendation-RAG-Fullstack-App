/**
 * services/ranker.js — hybrid scoring and re-ranking
 *
 * Takes the raw FAISS candidates (sorted by semantic similarity) and
 * applies a weighted formula that also accounts for price fit, rating,
 * and popularity. Returns the top 5 wines sorted by final score.
 *
 * Score formula (from CLAUDE.md):
 *   score =
 *     0.35 * semantic_similarity
 *     0.25 * food_pairing_score   (not yet implemented — reserved weight)
 *     0.20 * price_fit
 *     0.10 * rating
 *     0.10 * popularity
 *
 * All component scores are normalized to [0, 1] before weighting.
 */

const TOP_N = 5;

// Approximate max price in the dataset — used for normalization
const MAX_PRICE = 3300;
// Max points in the dataset
const MAX_POINTS = 100;
// Min points in our filtered subset
const MIN_POINTS = 93;

/**
 * Extract a budget hint from the query string, e.g. "under 20" → 20.
 * Returns null if no price hint is found.
 * @param {string} query
 * @returns {number|null}
 */
function parseBudget(query) {
  const match = query.match(/under\s*\$?€?(\d+)/i) || query.match(/(\d+)\s*(?:€|\$|euros?|dollars?)/i);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Score how well the wine price fits the user's budget.
 * - No budget hint → neutral score of 0.5
 * - Price under budget → score scales with how much room is left
 * - Price over budget → penalized proportionally
 * @param {number} price
 * @param {number|null} budget
 * @returns {number} 0–1
 */
function priceFitScore(price, budget) {
  if (budget === null) return 0.5;
  if (price <= budget) return 0.8 + 0.2 * (1 - price / budget);
  // Over budget: linear penalty
  const overshoot = (price - budget) / budget;
  return Math.max(0, 1 - overshoot);
}

/**
 * Normalize points (93–100) to 0–1.
 * @param {number} points
 * @returns {number}
 */
function ratingScore(points) {
  return (points - MIN_POINTS) / (MAX_POINTS - MIN_POINTS);
}

/**
 * Rough popularity proxy: cheaper wines tend to be more widely available.
 * Inverts price so affordable wines score slightly higher.
 * @param {number} price
 * @returns {number} 0–1
 */
function popularityScore(price) {
  return 1 - price / MAX_PRICE;
}

/**
 * Re-rank candidates using the hybrid formula and return the top N.
 * @param {Array} candidates - wines with semantic_score from FAISS
 * @param {string} query - original user query
 * @returns {Array} top N wines with a `score` field added
 */
export function rank(candidates, query) {
  const budget = parseBudget(query);

  const scored = candidates.map((wine) => {
    const semantic   = wine.semantic_score;                    // already 0–1
    const priceFit   = priceFitScore(wine.price, budget);
    const rating     = ratingScore(wine.points);
    const popularity = popularityScore(wine.price);

    const score =
      0.35 * semantic +
      0.20 * priceFit +
      0.10 * rating +
      0.10 * popularity;
    // food_pairing_score weight (0.25) not applied yet — reserved

    return { ...wine, score: parseFloat(score.toFixed(4)) };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N);
}
