# 🍷 Wine RAG Recommendation System — CLAUDE.md

## 🧠 Project Overview

You are building a full-stack **Wine Recommendation RAG system**.

The system is a production-style AI application that:
- accepts natural language queries (e.g. "red wine for steak under 20€")
- retrieves relevant wines using vector similarity search
- ranks results using a hybrid scoring system
- generates explanations using an LLM
- uses caching for performance optimization

This is NOT just a chatbot — it is a **retrieval + ranking + generation system**.

This is a **production-style RAG system with local vector DB (FAISS)**.


---

# 🏗️ System Architecture

## Core Pipeline

User Query  
→ Backend API (Node.js / Express)  
→ Redis Cache (fast path)  
→ Embedding Model (OpenAI)  
→ Vector Database (FAISS)  
→ Hybrid Ranking Engine  
→ LLM Explanation Layer  
→ Frontend (React)

---

# ⚙️ Tech Stack

## Frontend
- React + Vite
- REST API calls
- Tailwind (optional)

## Backend
- Node.js
- Express

## AI / RAG
- OpenAI Embeddings API
- OpenAI Chat / Responses API
- Vector DB (FAISS)

## Infrastructure
- Redis (caching layer)
- Docker (optional)

---

# 📦 Dataset

Use Kaggle Wine Reviews dataset:

https://www.kaggle.com/datasets/zynicide/wine-reviews

Dataset is located in:
/data/winemag-data-130k-v2.json


### Fields used:
- title
- description
- price
- points
- country
- variety



---

# 🧠 Core Features

## 1. RAG Pipeline

Steps:
- Convert user query → embedding
- Retrieve top-K similar wines from vector DB
- Pass results to ranking engine

---

## 2. Hybrid Ranking Engine

Final score calculation:

```text
score =
  0.35 * semantic_similarity +
  0.25 * food_pairing_score +
  0.20 * price_fit +
  0.10 * rating +
  0.10 * popularity

## Project goal

Build a Wine Recommendation RAG system using:
- Node.js backend
- React frontend
- FAISS for vector search
- OpenAI embeddings

## Project rules

- Always build MVP first
- Do not over-engineer
- No microservices
- No unnecessary abstractions
- Keep everything in a single backend service
- Document files and created functions

## Architecture

Frontend (React)
→ Backend (Express)
→ Embeddings (OpenAI)
→ Vector Search (FAISS)
→ Ranking Layer
→ LLM explanation

## Developing order

1. Backend API
2. Dataset loader
3. Embeddings
4. Vector search (FAISS)
5. Ranking
6. LLM explanation
7. Frontend integration