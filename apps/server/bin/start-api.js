#!/usr/bin/env node

import express from 'express';
import {
  handleGetSummary,
  handleRegenerateSummary,
  handleGetSummaryMeta,
} from '../src/routes/summaryRoutes.js';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// Health check
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AI Summary API
app.get('/v1/profile/summary', handleGetSummary);
app.post('/v1/profile/summary/regenerate', handleRegenerateSummary);
app.get('/v1/profile/summary/meta', handleGetSummaryMeta);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[api] Error:', err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`[api] Server listening on port ${PORT}`);
});
