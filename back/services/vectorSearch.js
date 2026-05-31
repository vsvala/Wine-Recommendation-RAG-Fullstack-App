/**
 * services/vectorSearch.js — calls the Python search.py script
 *
 * Express calls this instead of doing FAISS directly in Node,
 * because faiss-node lacks HNSW and is essentially unmaintained.
 *
 * Returns an array of wine objects, each with a `semantic_score` field (0–1).
 */

import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, '../scripts/search.py');

/**
 * Run vector similarity search against the FAISS index.
 * @param {string} query - Natural language query from the user
 * @returns {Promise<Array>} Top-K wine candidates with semantic_score attached
 */
export function search(query) {
  return new Promise((resolve, reject) => {
    execFile(
      'python3',
      [SCRIPT, query],
      // Pass only the API key instead of the full process.env —
      // child processes don't need access to all server environment variables.
      { env: { OPENAI_API_KEY: process.env.OPENAI_API_KEY } },
      (err, stdout, stderr) => {
        if (err) {
          return reject(new Error(`search.py failed: ${stderr || err.message}`));
        }
        try {
          resolve(JSON.parse(stdout));
        } catch {
          reject(new Error(`search.py returned invalid JSON: ${stdout}`));
        }
      }
    );
  });
}
