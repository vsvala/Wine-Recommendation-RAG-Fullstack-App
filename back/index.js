/**
 * index.js — Express server entry point
 *
 * Starts the API server and registers all routes.
 * Environment variables are loaded from .env via dotenv.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';
import recommendRouter from './routes/recommend.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Sets secure HTTP headers (X-Content-Type-Options, X-Frame-Options, etc.)
app.use(helmet());

// Allow requests from the Vite dev server only
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));

app.use(express.json());

// Rate limiting — each IP can call /recommend max 10 times per minute.
// Prevents a single user from draining the OpenAI API budget.
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again in a minute.' },
});
app.use('/recommend', limiter);

// Routes
app.use('/recommend', recommendRouter);

// Simple health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
