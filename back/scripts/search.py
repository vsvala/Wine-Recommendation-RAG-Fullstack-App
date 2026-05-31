"""
search.py — FAISS vector search for wine recommendations

Called by Express via child_process.execFile:
  python3 search.py "<query string>"

Prints a JSON array of top-K wine objects to stdout.
Each wine object includes the original metadata fields plus:
  - semantic_score: cosine similarity (0–1) to the query

The ranker in Node.js then applies hybrid scoring on top of these results.
"""

import json
import os
import sys
import numpy as np
import faiss
from openai import OpenAI

INDEX_PATH = os.path.join(os.path.dirname(__file__), '../../data/wines.index')
IDS_PATH   = os.path.join(os.path.dirname(__file__), '../../data/wines_ids.json')

# We use text-embedding-3-small: 1536 dimensions, cheap, fast, good quality
EMBED_MODEL = 'text-embedding-3-small'

# Fetch more candidates than the final top-5 so the ranker has room to reorder
TOP_K = 20

client = OpenAI(api_key=os.environ['OPENAI_API_KEY'])

# Load index and metadata once at startup (module level, not inside the function)
index = faiss.read_index(INDEX_PATH)
with open(IDS_PATH) as f:
    wines = json.load(f)


def search(query: str) -> list[dict]:
    """
    Embed the query, run nearest-neighbour search against the FAISS index,
    and return the top-K wines with their semantic similarity score attached.
    """
    resp = client.embeddings.create(model=EMBED_MODEL, input=[query])
    vec = np.array([resp.data[0].embedding], dtype='float32')

    # Normalize so inner product == cosine similarity
    faiss.normalize_L2(vec)

    scores, indices = index.search(vec, TOP_K)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        wine = wines[idx].copy()
        wine['semantic_score'] = float(score)
        results.append(wine)

    return results


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python3 search.py "<query>"', file=sys.stderr)
        sys.exit(1)

    query = sys.argv[1]
    results = search(query)
    print(json.dumps(results))
