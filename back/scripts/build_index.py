import json
import os
import sys
import numpy as np
import faiss
from openai import OpenAI

WINES_PATH = os.path.join(os.path.dirname(__file__), '../../data/wines_filtered.json')
INDEX_PATH = os.path.join(os.path.dirname(__file__), '../../data/wines.index')
IDS_PATH   = os.path.join(os.path.dirname(__file__), '../../data/wines_ids.json')

EMBED_MODEL = 'text-embedding-3-small'
BATCH_SIZE  = 100

client = OpenAI(api_key=os.environ['OPENAI_API_KEY'])

with open(WINES_PATH) as f:
    wines = json.load(f)

print(f'Embedding {len(wines)} wines in batches of {BATCH_SIZE}...')

all_embeddings = []

for i in range(0, len(wines), BATCH_SIZE):
    batch = wines[i:i + BATCH_SIZE]
    texts = [w['description'] for w in batch]
    resp = client.embeddings.create(model=EMBED_MODEL, input=texts)
    vecs = [e.embedding for e in resp.data]
    all_embeddings.extend(vecs)
    print(f'  {min(i + BATCH_SIZE, len(wines))}/{len(wines)}', end='\r')

print()

vectors = np.array(all_embeddings, dtype='float32')
faiss.normalize_L2(vectors)

dim = vectors.shape[1]
index = faiss.IndexFlatIP(dim)  # inner product = cosine similarity after normalization
index.add(vectors)

faiss.write_index(index, INDEX_PATH)
print(f'FAISS index saved to {INDEX_PATH}')

# Save wine metadata (id -> wine object) so search.py can return full wine data
with open(IDS_PATH, 'w') as f:
    json.dump(wines, f)
print(f'Wine metadata saved to {IDS_PATH}')
