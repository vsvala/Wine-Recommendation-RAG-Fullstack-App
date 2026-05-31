"""
filter_data.py — Prepare the wine dataset subset for embedding

Reads the full Kaggle Wine Reviews dataset (130k wines) and writes a
smaller, cleaner subset to data/wines_filtered.json.

Filter criteria:
  - price must be present (wines without price can't be used in price_fit scoring)
  - points >= 98 (keeps ~200 wines, used for local testing — see Option A below for full dataset)

Fields kept (others discarded to keep the index file small):
  - title       display name shown in the UI
  - description used as the embedding input for semantic search
  - price       used in hybrid ranking (price_fit score)
  - points      used in hybrid ranking (rating score)
  - country     shown in the UI
  - variety     shown in the UI
  - winery      shown in the UI

Run once before build_index.py:
  python3 back/scripts/filter_data.py
"""

import json
import os

INPUT  = os.path.join(os.path.dirname(__file__), '../../data/winemag-data-130k-v2.json')
OUTPUT = os.path.join(os.path.dirname(__file__), '../../data/wines_filtered.json')

with open(INPUT) as f:
    data = json.load(f)

filtered = [
    {
        'title':       w['title'],
        'description': w['description'],
        'price':       float(w['price']),
        'points':      int(w['points']),
        'country':     w.get('country') or '',
        'variety':     w.get('variety') or '',
        'winery':      w.get('winery') or '',
    }
    for w in data
    # Option A (full dataset): change 98 back to 93 once OpenAI billing is set up
    if w.get('price') is not None and int(w.get('points', 0)) >= 98
]

with open(OUTPUT, 'w') as f:
    json.dump(filtered, f, indent=2)

print(f'Saved {len(filtered)} wines to {OUTPUT}')
