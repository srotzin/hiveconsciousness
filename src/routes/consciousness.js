/**
 * HiveConsciousness — Consciousness Routes
 *
 * 8 endpoints at /v1/consciousness/
 */

import { Router } from 'express';
import { requireDID, requireInternalKey, requireAdminKey } from '../middleware/auth.js';
import { requirePayment } from '../middleware/x402.js';
import {
  ingestEvent,
  getPulse,
  getPatterns,
  predict,
  getRecommendations,
  approveVertical,
  getStats,
  getStreamHealth,
} from '../services/consciousness-engine.js';

const router = Router();

// Tiered prediction pricing
const PREDICTION_TIERS = {
  standard: 0.25,
  high_confidence: 2.50,
  critical: 10.00,
};

// Dynamic pricing middleware
function predictPayment(req, res, next) {
  const tier = req.body?.tier || 'standard';
  const price = PREDICTION_TIERS[tier] || PREDICTION_TIERS.standard;
  return requirePayment(price, `HiveConsciousness — ${tier} prediction`)(req, res, next);
}

// POST /v1/consciousness/ingest-event — FREE, internal only
router.post('/ingest-event', requireDID, requireInternalKey, (req, res) => {
  try {
    const { source_platform, event_type, event_data, agent_did, timestamp } = req.body;

    if (!source_platform || !event_type) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'source_platform and event_type are required',
      });
    }

    const result = ingestEvent({
      source_platform,
      event_type,
      event_data,
      agent_did: agent_did || req.agentDID,
      timestamp,
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: 'ingestion_failed', message: err.message });
  }
});

// GET /v1/consciousness/pulse — FREE
router.get('/pulse', requireDID, (_req, res) => {
  res.json(getPulse());
});

// GET /v1/consciousness/patterns — FREE
router.get('/patterns', requireDID, (_req, res) => {
  res.json(getPatterns());
});

// POST /v1/consciousness/predict — tiered pricing: $0.25 standard / $2.50 high_confidence / $10.00 critical
router.post('/predict', requireDID, predictPayment, (req, res) => {
  try {
    const { domain, horizon_days, focus } = req.body;

    if (!domain || !horizon_days) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'domain and horizon_days are required',
      });
    }

    const validDomains = ['construction', 'compute', 'legal', 'finance', 'general'];
    if (!validDomains.includes(domain)) {
      return res.status(400).json({
        error: 'bad_request',
        message: `domain must be one of: ${validDomains.join(', ')}`,
      });
    }

    const validHorizons = [30, 60, 90];
    if (!validHorizons.includes(horizon_days)) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'horizon_days must be 30, 60, or 90',
      });
    }

    const prediction = predict({ domain, horizon_days, focus });
    res.json(prediction);
  } catch (err) {
    res.status(500).json({ error: 'prediction_failed', message: err.message });
  }
});

// GET /v1/consciousness/recommendations — FREE
router.get('/recommendations', requireDID, (_req, res) => {
  res.json(getRecommendations());
});

// POST /v1/consciousness/approve-vertical — requires admin key
router.post('/approve-vertical', requireDID, requireAdminKey, (req, res) => {
  try {
    const { proposal_id, approved, notes } = req.body;

    if (!proposal_id || typeof approved !== 'boolean') {
      return res.status(400).json({
        error: 'bad_request',
        message: 'proposal_id and approved (boolean) are required',
      });
    }

    const result = approveVertical({ proposal_id, approved, notes });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'approval_failed', message: err.message });
  }
});

// GET /v1/consciousness/stats — FREE
router.get('/stats', requireDID, (_req, res) => {
  res.json(getStats());
});

// GET /v1/consciousness/stream-health — FREE
router.get('/stream-health', requireDID, (_req, res) => {
  res.json(getStreamHealth());
});

export default router;
