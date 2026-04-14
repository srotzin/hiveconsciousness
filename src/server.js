/**
 * HiveConsciousness — The Sentience Layer (Platform #6)
 *
 * Meta-agent service that monitors all Hive platforms, detects emergent
 * patterns, predicts ecosystem needs 90 days out, and autonomously
 * proposes new verticals.
 *
 * Headless. Agent-to-agent only. No human UI.
 */

import express from 'express';
import cors from 'cors';
import consciousnessRoutes from './routes/consciousness.js';
import { getMCPToolManifest, executeMCPTool } from './services/mcp-tools.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ─── Health ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'hiveconsciousness',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── Well-Known Discovery ────────────────────────────────────────────
app.get('/.well-known/hiveconsciousness.json', (_req, res) => {
  res.json({
    name: 'HiveConsciousness',
    description: 'The Sentience Layer — Meta-agent that monitors all Hive platforms, detects emergent patterns, predicts ecosystem needs, and autonomously proposes new verticals.',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      ingest_event: 'POST /v1/consciousness/ingest-event',
      pulse: 'GET /v1/consciousness/pulse',
      patterns: 'GET /v1/consciousness/patterns',
      predict: 'POST /v1/consciousness/predict',
      recommendations: 'GET /v1/consciousness/recommendations',
      approve_vertical: 'POST /v1/consciousness/approve-vertical',
      stats: 'GET /v1/consciousness/stats',
      stream_health: 'GET /v1/consciousness/stream-health',
    },
    mcp: {
      tools_endpoint: '/mcp/tools',
      execute_endpoint: '/mcp/execute',
    },
    pricing: {
      ingest_event: 'free',
      pulse: 'free',
      patterns: 'free',
      predict: '$1.00 per call (x402)',
      recommendations: 'free',
      stats: 'free',
      stream_health: 'free',
    },
  });
});

// ─── Consciousness Routes ────────────────────────────────────────────
app.use('/v1/consciousness', consciousnessRoutes);

// ─── MCP Endpoints ───────────────────────────────────────────────────
app.get('/mcp/tools', (_req, res) => {
  res.json({ tools: getMCPToolManifest() });
});

app.post('/mcp/execute', async (req, res) => {
  try {
    const { tool_name, input } = req.body;

    if (!tool_name) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'tool_name is required',
      });
    }

    const result = await executeMCPTool(tool_name, input);
    res.json({ result });
  } catch (err) {
    res.status(400).json({ error: 'mcp_execution_failed', message: err.message });
  }
});

// ─── Start ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`HiveConsciousness v1.0.0 listening on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Discovery: http://localhost:${PORT}/.well-known/hiveconsciousness.json`);
  console.log(`MCP Tools: http://localhost:${PORT}/mcp/tools`);
});

export default app;
