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
// Use the venv's python3 directly so this works regardless of which
// python3 is first on PATH (the child process below gets a stripped env).
const PYTHON = path.join(__dirname, '../venv/bin/python3');

/**
 * Run vector similarity search against the FAISS index.
 * @param {string} query - Natural language query from the user
 * @returns {Promise<Array>} Top-K wine candidates with semantic_score attached
 */
export function search(query) {
  return new Promise((resolve, reject) => {
    execFile(
      PYTHON,
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
