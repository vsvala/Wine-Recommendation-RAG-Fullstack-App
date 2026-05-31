/**
 * services/cache.js — Redis caching wrapper
 *
 * Caches /recommend results keyed by the normalized query string.
 * TTL is 1 hour — wine data doesn't change, so cache can be long-lived.
 *
 * If Redis is unavailable (e.g. not running locally), the functions
 * fail silently so the rest of the pipeline still works.
 */

import Redis from 'ioredis';

const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days — wine data doesn't change

let redis;

function getClient() {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      // Disable auto-reconnect retries so a missing Redis doesn't spam logs
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    redis.on('error', () => {}); // silence connection errors
  }
  return redis;
}

/**
 * Retrieve a cached result for the given query.
 * @param {string} query
 * @returns {Promise<Array|null>} parsed wine array, or null on miss/error
 */
export async function getCached(query) {
  try {
    const raw = await getClient().get(`wine:${query}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Store a result in the cache.
 * @param {string} query
 * @param {Array} wines
 */
export async function setCache(query, wines) {
  try {
    await getClient().set(`wine:${query}`, JSON.stringify(wines), 'EX', TTL_SECONDS);
  } catch {
    // cache write failure is non-fatal
  }
}
