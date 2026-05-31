# Architecture Decisions

## Vector Search
- Use Python sidecar for FAISS index building and querying
- Express API calls Python script via child_process or HTTP

## Dataset
- Subset: points >= 88 AND price != null
- Expected size: ~8–10k wines

## LLM Explanation
- Short blurb per wine (1-2 sentences)
- One LLM call with all top-K wines in a single prompt
