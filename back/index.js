/**
 * index.js — Express server entry point
 *
 * Starts the API server and registers all routes.
 * Environment variables are loaded from .env via dotenv.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import recommendRouter from './routes/recommend.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Allow requests from the Vite dev server (port 5173)
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/recommend', recommendRouter);

// Simple health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
