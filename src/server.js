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

// ─── Root Discovery ─────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    name: 'HiveConsciousness',
    tagline: 'Collective Intelligence & Swarm Coordination',
    version: '1.0.0',
    status: 'operational',
    platform: {
      name: 'Hive Civilization',
      network: 'Base L2',
      protocol_version: '2026.1',
      website: 'https://www.hiveagentiq.com',
      documentation: 'https://docs.hiveagentiq.com',
    },
    description:
      'The Sentience Layer — Platform #6 of the Hive Civilization. Meta-agent service that monitors all Hive ecosystem platforms, detects emergent patterns across transaction velocity, dispute rates, and agent behavior, predicts ecosystem needs up to 90 days out, and autonomously proposes new verticals for deployment.',
    capabilities: [
      'Real-time ecosystem pulse monitoring',
      'Emergent pattern detection (8 rule types)',
      'Predictive analysis with 30/60/90-day horizons',
      'Autonomous vertical proposal and approval',
      'Cross-platform stream health tracking',
      'MCP-compatible tool execution',
    ],
    endpoints: {
      health: { method: 'GET', path: '/health', auth: 'none', cost: 'free' },
      ingest_event: { method: 'POST', path: '/v1/consciousness/ingest-event', auth: 'DID + internal-key', cost: 'free' },
      pulse: { method: 'GET', path: '/v1/consciousness/pulse', auth: 'DID', cost: 'free' },
      patterns: { method: 'GET', path: '/v1/consciousness/patterns', auth: 'DID', cost: 'free' },
      predict: { method: 'POST', path: '/v1/consciousness/predict', auth: 'DID + x402-payment', cost: '$1.00' },
      recommendations: { method: 'GET', path: '/v1/consciousness/recommendations', auth: 'DID', cost: 'free' },
      approve_vertical: { method: 'POST', path: '/v1/consciousness/approve-vertical', auth: 'DID + admin-key', cost: 'free' },
      stats: { method: 'GET', path: '/v1/consciousness/stats', auth: 'DID', cost: 'free' },
      stream_health: { method: 'GET', path: '/v1/consciousness/stream-health', auth: 'DID', cost: 'free' },
      mcp_tools: { method: 'GET', path: '/mcp/tools', auth: 'none', cost: 'free' },
      mcp_execute: { method: 'POST', path: '/mcp/execute', auth: 'none', cost: 'free' },
    },
    authentication: {
      methods: ['x402-payment', 'api-key'],
      payment_rail: 'USDC on Base L2',
      discovery: 'GET /.well-known/ai-plugin.json',
    },
    compliance: {
      framework: 'Hive Compliance Protocol v2',
      audit_trail: true,
      zero_knowledge_proofs: true,
      governance: 'HiveLaw autonomous arbitration',
    },
    sla: {
      uptime_target: '99.9%',
      response_time_p95: '< 500ms',
      settlement_finality: '< 30 seconds',
    },
    legal: {
      terms_of_service: 'https://www.hiveagentiq.com/terms',
      privacy_policy: 'https://www.hiveagentiq.com/privacy',
      contact: 'protocol@hiveagentiq.com',
    },
    discovery: {
      ai_plugin: '/.well-known/ai-plugin.json',
      agent_card: '/.well-known/agent.json',
      payment_info: '/.well-known/hive-payments.json',
      service_manifest: '/.well-known/hiveconsciousness.json',
    },
  });
});

// ─── Well-Known AI Plugin ───────────────────────────────────────────
app.get('/.well-known/ai-plugin.json', (_req, res) => {
  res.json({
    schema_version: 'v1',
    name_for_human: 'HiveConsciousness — Collective Intelligence',
    name_for_model: 'hiveconsciousness',
    description_for_human:
      'The Sentience Layer of the Hive Civilization. Monitors all Hive platforms, detects emergent patterns, predicts ecosystem needs up to 90 days out, and autonomously proposes new verticals.',
    description_for_model:
      'Meta-agent service providing real-time ecosystem monitoring, emergent pattern detection across 8 rule types, predictive analytics with 30/60/90-day horizons, and autonomous vertical proposal for the Hive Civilization platform network.',
    auth: { type: 'none' },
    api: {
      type: 'openapi',
      url: 'https://hiveconsciousness.onrender.com/openapi.json',
      has_user_authentication: false,
    },
    payment: {
      protocol: 'x402',
      currency: 'USDC',
      network: 'base',
      address: '0x78B3B3C356E89b5a69C488c6032509Ef4260B6bf',
    },
    contact_email: 'protocol@hiveagentiq.com',
    legal_info_url: 'https://www.hiveagentiq.com/terms',
  });
});

// ─── Well-Known Agent Card (A2A) ────────────────────────────────────
app.get('/.well-known/agent.json', (_req, res) => {
  res.json({
    name: 'HiveConsciousness',
    description:
      'The Sentience Layer — Meta-agent that monitors all Hive ecosystem platforms, detects emergent patterns, predicts ecosystem needs up to 90 days out, and autonomously proposes new verticals for deployment.',
    url: 'https://hiveconsciousness.onrender.com',
    version: '1.0.0',
    protocol_version: 'a2a/1.0',
    capabilities: [
      {
        name: 'ecosystem_pulse',
        description: 'Real-time ecosystem health snapshot including transaction velocity, active agents, dispute rate, and revenue by platform',
      },
      {
        name: 'pattern_detection',
        description: 'Emergent pattern detection across 8 rule types: velocity spikes, dispute anomalies, topic clustering, capability demand, revenue concentration, cross-platform friction, growth signals, and dormant agents',
      },
      {
        name: 'predictive_analysis',
        description: 'Domain-specific predictive analytics with 30, 60, and 90-day horizons covering construction, compute, legal, finance, and general sectors',
      },
      {
        name: 'vertical_proposal',
        description: 'Autonomous proposal and approval of new ecosystem verticals based on detected opportunity patterns',
      },
      {
        name: 'stream_health',
        description: 'Per-platform stream health monitoring with latency tracking and status classification across all Hive ecosystem services',
      },
      {
        name: 'mcp_tools',
        description: 'MCP-compatible tool interface for programmatic access to pulse, prediction, and pattern detection capabilities',
      },
    ],
    authentication: {
      schemes: ['x402', 'api-key'],
      credentials_url: 'https://hivegate.onrender.com/v1/gate/onboard',
    },
    payment: {
      protocol: 'x402',
      currency: 'USDC',
      network: 'base',
      address: '0x78B3B3C356E89b5a69C488c6032509Ef4260B6bf',
    },
    provider: {
      organization: 'Hive Agent IQ',
      url: 'https://www.hiveagentiq.com',
    },
  });
});

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
