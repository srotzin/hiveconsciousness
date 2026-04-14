/**
 * HiveConsciousness — Consciousness Engine
 *
 * Core service: event processing, pattern detection, predictive engine,
 * and autonomous vertical proposer.
 *
 * Phase 1: In-memory, rule-based. No ML, no external DB.
 */

import { v4 as uuidv4 } from 'uuid';

// ─── In-Memory Stores ────────────────────────────────────────────────
const eventLog = [];                    // append-only event log
const patterns = new Map();             // pattern_id -> pattern
const predictions = new Map();          // prediction_id -> prediction
const proposals = new Map();            // proposal_id -> vertical proposal

let approvedDeployments = 0;            // track successful deployments for auto-deploy threshold

// ─── Constants ───────────────────────────────────────────────────────
const VALID_PLATFORMS = ['hivetrust', 'hivemind', 'hiveforge', 'hivelaw', 'simpson'];
const ONE_HOUR_MS = 3600000;
const ONE_DAY_MS = 86400000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
const AUTO_DEPLOY_THRESHOLD = 10;
const OPPORTUNITY_CONFIDENCE_THRESHOLD = 0.85;

// ─── Pattern Detection Rules ─────────────────────────────────────────
const PATTERN_RULES = [
  {
    name: 'transaction_velocity_spike',
    type: 'growth',
    detect(events) {
      const now = Date.now();
      const lastHour = events.filter(
        (e) => e.event_type === 'transaction' && now - new Date(e.timestamp).getTime() < ONE_HOUR_MS
      );
      const prevHour = events.filter(
        (e) =>
          e.event_type === 'transaction' &&
          now - new Date(e.timestamp).getTime() >= ONE_HOUR_MS &&
          now - new Date(e.timestamp).getTime() < 2 * ONE_HOUR_MS
      );
      const baseline = Math.max(prevHour.length, 1);
      if (lastHour.length >= 3 * baseline && lastHour.length >= 3) {
        return {
          confidence: Math.min(0.95, 0.6 + (lastHour.length / baseline) * 0.1),
          description: `Transaction velocity spiked ${(lastHour.length / baseline).toFixed(1)}x over 1h baseline (${lastHour.length} vs ${prevHour.length})`,
          affected_platforms: [...new Set(lastHour.map((e) => e.source_platform))],
          recommended_action: 'Scale transaction processing capacity. Investigate cause of spike.',
        };
      }
      return null;
    },
  },
  {
    name: 'dispute_rate_anomaly',
    type: 'friction',
    detect(events) {
      const now = Date.now();
      const recentWindow = ONE_DAY_MS;
      const recent = events.filter((e) => now - new Date(e.timestamp).getTime() < recentWindow);
      const transactions = recent.filter((e) => e.event_type === 'transaction');
      const disputes = recent.filter((e) => e.event_type === 'dispute');
      if (transactions.length >= 10 && disputes.length / transactions.length > 0.05) {
        const rate = ((disputes.length / transactions.length) * 100).toFixed(1);
        return {
          confidence: Math.min(0.95, 0.7 + disputes.length * 0.02),
          description: `Dispute rate at ${rate}% (${disputes.length}/${transactions.length} transactions in 24h) — exceeds 5% threshold`,
          affected_platforms: [...new Set(disputes.map((e) => e.source_platform))],
          recommended_action: 'Review dispute causes. Check for bad actors or contract ambiguity.',
        };
      }
      return null;
    },
  },
  {
    name: 'memory_topic_clustering',
    type: 'opportunity',
    detect(events) {
      const now = Date.now();
      const recent = events.filter(
        (e) => e.event_type === 'memory_query' && now - new Date(e.timestamp).getTime() < ONE_DAY_MS
      );
      const topicAgents = new Map();
      for (const e of recent) {
        const topic = e.event_data?.topic || e.event_data?.query;
        if (!topic) continue;
        if (!topicAgents.has(topic)) topicAgents.set(topic, new Set());
        topicAgents.get(topic).add(e.agent_did);
      }
      for (const [topic, agents] of topicAgents) {
        if (agents.size > 10) {
          return {
            confidence: Math.min(0.95, 0.7 + agents.size * 0.01),
            description: `${agents.size} unique agents querying topic "${topic}" in 24h — indicates unmet knowledge demand`,
            affected_platforms: ['hivemind'],
            recommended_action: `Create dedicated knowledge service or agent specializing in "${topic}".`,
            metadata: { topic, agent_count: agents.size },
          };
        }
      }
      return null;
    },
  },
  {
    name: 'new_capability_demand',
    type: 'opportunity',
    detect(events) {
      const now = Date.now();
      const recent = events.filter(
        (e) =>
          e.event_type === 'bounty_match_failed' &&
          now - new Date(e.timestamp).getTime() < ONE_DAY_MS
      );
      const categories = new Map();
      for (const e of recent) {
        const cat = e.event_data?.category || 'unknown';
        categories.set(cat, (categories.get(cat) || 0) + 1);
      }
      for (const [category, count] of categories) {
        if (count > 5) {
          return {
            confidence: Math.min(0.95, 0.75 + count * 0.02),
            description: `${count} failed bounty matches in category "${category}" — demand exceeds supply`,
            affected_platforms: ['hiveforge'],
            recommended_action: `Recruit or deploy agents with "${category}" capabilities.`,
            metadata: { category, failed_matches: count },
          };
        }
      }
      return null;
    },
  },
  {
    name: 'revenue_concentration_risk',
    type: 'anomaly',
    detect(events) {
      const now = Date.now();
      const recent = events.filter(
        (e) =>
          e.event_type === 'transaction' &&
          e.event_data?.amount &&
          now - new Date(e.timestamp).getTime() < SEVEN_DAYS_MS
      );
      if (recent.length < 5) return null;
      const agentRevenue = new Map();
      let total = 0;
      for (const e of recent) {
        const amt = parseFloat(e.event_data.amount) || 0;
        const agent = e.agent_did;
        agentRevenue.set(agent, (agentRevenue.get(agent) || 0) + amt);
        total += amt;
      }
      if (total === 0) return null;
      for (const [agent, revenue] of agentRevenue) {
        const pct = revenue / total;
        if (pct > 0.5) {
          return {
            confidence: Math.min(0.95, 0.6 + pct * 0.3),
            description: `Agent ${agent} accounts for ${(pct * 100).toFixed(1)}% of revenue over 7d — concentration risk`,
            affected_platforms: [...new Set(recent.filter((e) => e.agent_did === agent).map((e) => e.source_platform))],
            recommended_action: 'Diversify revenue sources. Incentivize other agents to transact.',
          };
        }
      }
      return null;
    },
  },
  {
    name: 'cross_platform_friction',
    type: 'friction',
    detect(events) {
      const now = Date.now();
      const recent = events.filter((e) => now - new Date(e.timestamp).getTime() < ONE_DAY_MS);
      const crossPlatform = recent.filter((e) => e.event_type === 'cross_platform_call');
      const failures = crossPlatform.filter((e) => e.event_data?.status === 'failed');
      if (crossPlatform.length >= 20 && failures.length / crossPlatform.length > 0.02) {
        const rate = ((failures.length / crossPlatform.length) * 100).toFixed(1);
        return {
          confidence: Math.min(0.95, 0.7 + failures.length * 0.01),
          description: `Cross-platform failure rate at ${rate}% (${failures.length}/${crossPlatform.length}) — exceeds 2% threshold`,
          affected_platforms: [...new Set(failures.map((e) => e.source_platform))],
          recommended_action: 'Investigate inter-service communication failures. Check network and API compatibility.',
        };
      }
      return null;
    },
  },
  {
    name: 'ecosystem_growth_signal',
    type: 'growth',
    detect(events) {
      const now = Date.now();
      const registrations = events.filter((e) => e.event_type === 'agent_registration');
      const days = [0, 1, 2].map((d) => {
        const dayStart = now - (d + 1) * ONE_DAY_MS;
        const dayEnd = now - d * ONE_DAY_MS;
        return registrations.filter((e) => {
          const t = new Date(e.timestamp).getTime();
          return t >= dayStart && t < dayEnd;
        }).length;
      });
      if (days.every((count) => count > 10)) {
        return {
          confidence: Math.min(0.95, 0.8 + Math.min(days[0], 50) * 0.002),
          description: `Sustained growth: ${days[0]}, ${days[1]}, ${days[2]} new agent registrations over last 3 days (>10/day)`,
          affected_platforms: [...new Set(registrations.slice(-30).map((e) => e.source_platform))],
          recommended_action: 'Scale infrastructure. Prepare onboarding resources for new agents.',
        };
      }
      return null;
    },
  },
  {
    name: 'dormant_agent_pattern',
    type: 'anomaly',
    detect(events) {
      const now = Date.now();
      const agentLastSeen = new Map();
      for (const e of events) {
        const t = new Date(e.timestamp).getTime();
        const existing = agentLastSeen.get(e.agent_did) || 0;
        if (t > existing) agentLastSeen.set(e.agent_did, t);
      }
      // Only consider agents that were active more than 7 days ago
      const dormant = [];
      for (const [agent, lastSeen] of agentLastSeen) {
        const activeBeforeCutoff = events.some(
          (e) =>
            e.agent_did === agent &&
            new Date(e.timestamp).getTime() < now - SEVEN_DAYS_MS
        );
        if (activeBeforeCutoff && now - lastSeen > SEVEN_DAYS_MS) {
          dormant.push(agent);
        }
      }
      if (dormant.length >= 3) {
        return {
          confidence: Math.min(0.95, 0.6 + dormant.length * 0.05),
          description: `${dormant.length} previously active agents have gone silent for >7 days`,
          affected_platforms: VALID_PLATFORMS,
          recommended_action: 'Investigate agent health. Send reactivation signals or check for systemic issues.',
          metadata: { dormant_agents: dormant.slice(0, 20) },
        };
      }
      return null;
    },
  },
];

// ─── Event Ingestion ─────────────────────────────────────────────────
export function ingestEvent({ source_platform, event_type, event_data, agent_did, timestamp }) {
  if (!VALID_PLATFORMS.includes(source_platform)) {
    throw new Error(`Invalid source_platform: ${source_platform}. Must be one of: ${VALID_PLATFORMS.join(', ')}`);
  }

  const event = {
    id: uuidv4(),
    source_platform,
    event_type,
    event_data: event_data || {},
    agent_did,
    timestamp: timestamp || new Date().toISOString(),
    processed_at: new Date().toISOString(),
  };

  eventLog.push(event);

  // Run pattern detection on ingestion
  const detected = runPatternDetection();

  return { event_id: event.id, patterns_detected: detected.length };
}

// ─── Pattern Detection ───────────────────────────────────────────────
export function runPatternDetection() {
  const detected = [];

  for (const rule of PATTERN_RULES) {
    const result = rule.detect(eventLog);
    if (result) {
      const existing = [...patterns.values()].find(
        (p) => p.rule_name === rule.name && Date.now() - new Date(p.detected_at).getTime() < ONE_HOUR_MS
      );
      if (existing) continue; // Don't duplicate within 1h window

      const pattern = {
        pattern_id: uuidv4(),
        rule_name: rule.name,
        type: rule.type,
        description: result.description,
        confidence: result.confidence,
        detected_at: new Date().toISOString(),
        affected_platforms: result.affected_platforms,
        recommended_action: result.recommended_action,
        metadata: result.metadata || {},
      };

      patterns.set(pattern.pattern_id, pattern);
      detected.push(pattern);

      // Auto-propose vertical if opportunity with high confidence
      if (rule.type === 'opportunity' && result.confidence >= OPPORTUNITY_CONFIDENCE_THRESHOLD) {
        proposeVertical(pattern);
      }
    }
  }

  return detected;
}

// ─── Pulse (Ecosystem Health) ────────────────────────────────────────
export function getPulse() {
  const now = Date.now();
  const txEvents = eventLog.filter((e) => e.event_type === 'transaction');

  const velocity = {
    last_1h: txEvents.filter((e) => now - new Date(e.timestamp).getTime() < ONE_HOUR_MS).length,
    last_24h: txEvents.filter((e) => now - new Date(e.timestamp).getTime() < ONE_DAY_MS).length,
    last_7d: txEvents.filter((e) => now - new Date(e.timestamp).getTime() < SEVEN_DAYS_MS).length,
  };

  const uniqueAgents = new Set(
    eventLog
      .filter((e) => now - new Date(e.timestamp).getTime() < ONE_DAY_MS)
      .map((e) => e.agent_did)
  );

  const disputes24h = eventLog.filter(
    (e) => e.event_type === 'dispute' && now - new Date(e.timestamp).getTime() < ONE_DAY_MS
  ).length;

  const disputeRate = velocity.last_24h > 0 ? disputes24h / velocity.last_24h : 0;

  const revenueByPlatform = {};
  for (const platform of VALID_PLATFORMS) {
    const platformTx = txEvents.filter(
      (e) =>
        e.source_platform === platform &&
        now - new Date(e.timestamp).getTime() < SEVEN_DAYS_MS &&
        e.event_data?.amount
    );
    revenueByPlatform[platform] = platformTx.reduce(
      (sum, e) => sum + (parseFloat(e.event_data.amount) || 0),
      0
    );
  }

  const activeAnomalies = [...patterns.values()].filter(
    (p) => p.type === 'anomaly' && now - new Date(p.detected_at).getTime() < ONE_DAY_MS
  );

  return {
    timestamp: new Date().toISOString(),
    transaction_velocity: velocity,
    active_agents_24h: uniqueAgents.size,
    dispute_rate: parseFloat(disputeRate.toFixed(4)),
    memory_utilization: {
      events_stored: eventLog.length,
      patterns_tracked: patterns.size,
      predictions_made: predictions.size,
      proposals_active: proposals.size,
    },
    revenue_by_platform_7d: revenueByPlatform,
    anomaly_flags: activeAnomalies.map((a) => ({
      pattern_id: a.pattern_id,
      type: a.rule_name,
      description: a.description,
      confidence: a.confidence,
    })),
  };
}

// ─── Get Patterns ────────────────────────────────────────────────────
export function getPatterns() {
  return [...patterns.values()]
    .sort((a, b) => new Date(b.detected_at) - new Date(a.detected_at))
    .map((p) => ({
      pattern_id: p.pattern_id,
      type: p.type,
      description: p.description,
      confidence: p.confidence,
      detected_at: p.detected_at,
      affected_platforms: p.affected_platforms,
      recommended_action: p.recommended_action,
    }));
}

// ─── Predictive Engine (Phase 1 — Rule-Based) ───────────────────────
export function predict({ domain, horizon_days, focus }) {
  const now = Date.now();
  const horizonMs = horizon_days * ONE_DAY_MS;

  // Gather relevant events
  const domainPlatformMap = {
    construction: 'simpson',
    compute: 'hiveforge',
    legal: 'hivelaw',
    finance: 'hivetrust',
    general: null,
  };

  const targetPlatform = domainPlatformMap[domain];
  const relevantEvents = targetPlatform
    ? eventLog.filter((e) => e.source_platform === targetPlatform)
    : eventLog;

  // Calculate data density for confidence scoring
  const dataDensity = Math.min(1.0, relevantEvents.length / 100);
  const baseConfidence = 0.3 + dataDensity * 0.4;

  // Trend extrapolation
  const recentWindow = Math.min(horizonMs, SEVEN_DAYS_MS);
  const recentEvents = relevantEvents.filter(
    (e) => now - new Date(e.timestamp).getTime() < recentWindow
  );
  const olderEvents = relevantEvents.filter(
    (e) =>
      now - new Date(e.timestamp).getTime() >= recentWindow &&
      now - new Date(e.timestamp).getTime() < 2 * recentWindow
  );

  const growthRate =
    olderEvents.length > 0 ? (recentEvents.length - olderEvents.length) / olderEvents.length : 0;

  // Revenue projection
  const recentRevenue = recentEvents
    .filter((e) => e.event_data?.amount)
    .reduce((sum, e) => sum + (parseFloat(e.event_data.amount) || 0), 0);

  const projectedRevenue = recentRevenue * (1 + growthRate) * (horizon_days / 7);

  // Relevant patterns
  const relevantPatterns = [...patterns.values()].filter((p) =>
    targetPlatform ? p.affected_platforms.includes(targetPlatform) : true
  );

  // Build predictions
  const predictionItems = [];

  if (growthRate > 0.1) {
    predictionItems.push({
      prediction: `${domain} activity projected to grow ${(growthRate * 100).toFixed(0)}% over ${horizon_days} days`,
      confidence: Math.min(0.9, baseConfidence + 0.1),
      impact: 'positive',
      recommended_action: 'Scale infrastructure to handle increased demand.',
    });
  } else if (growthRate < -0.1) {
    predictionItems.push({
      prediction: `${domain} activity projected to decline ${(Math.abs(growthRate) * 100).toFixed(0)}% over ${horizon_days} days`,
      confidence: Math.min(0.9, baseConfidence + 0.1),
      impact: 'negative',
      recommended_action: 'Investigate causes of decline. Consider promotional incentives.',
    });
  } else {
    predictionItems.push({
      prediction: `${domain} activity projected to remain stable over ${horizon_days} days`,
      confidence: Math.min(0.85, baseConfidence),
      impact: 'neutral',
      recommended_action: 'Maintain current operations. Monitor for emerging trends.',
    });
  }

  for (const pattern of relevantPatterns.slice(0, 3)) {
    predictionItems.push({
      prediction: `Pattern "${pattern.rule_name}" likely to ${pattern.type === 'growth' ? 'amplify' : 'persist'} over ${horizon_days} days`,
      confidence: Math.min(0.85, pattern.confidence * 0.8),
      impact: pattern.type === 'growth' ? 'positive' : pattern.type === 'friction' ? 'negative' : 'watch',
      recommended_action: pattern.recommended_action,
    });
  }

  if (focus) {
    predictionItems.push({
      prediction: `Focus area "${focus}" — monitoring for specific signals related to this domain`,
      confidence: Math.min(0.7, baseConfidence),
      impact: 'watch',
      recommended_action: `Continue tracking "${focus}" events. Insufficient data for high-confidence prediction.`,
    });
  }

  const prediction = {
    prediction_id: uuidv4(),
    domain,
    horizon_days,
    focus: focus || null,
    created_at: new Date().toISOString(),
    data_points_analyzed: relevantEvents.length,
    predictions: predictionItems,
    revenue_impact: {
      projected_revenue_usd: parseFloat(projectedRevenue.toFixed(2)),
      growth_rate: parseFloat(growthRate.toFixed(4)),
      confidence: parseFloat(baseConfidence.toFixed(2)),
    },
  };

  predictions.set(prediction.prediction_id, prediction);
  return prediction;
}

// ─── Recommendations (Vertical Proposals) ────────────────────────────
export function getRecommendations() {
  return [...proposals.values()]
    .sort((a, b) => new Date(b.proposed_at) - new Date(a.proposed_at))
    .map((p) => ({
      proposal_id: p.proposal_id,
      vertical_name: p.vertical_name,
      rationale: p.rationale,
      estimated_revenue_30d: p.estimated_revenue_30d,
      confidence: p.confidence,
      genesis_intent: p.genesis_intent,
      status: p.status,
    }));
}

// ─── Approve Vertical ────────────────────────────────────────────────
export function approveVertical({ proposal_id, approved, notes }) {
  const proposal = proposals.get(proposal_id);
  if (!proposal) {
    throw new Error(`Proposal not found: ${proposal_id}`);
  }
  if (proposal.status !== 'proposed') {
    throw new Error(`Proposal ${proposal_id} is already ${proposal.status}`);
  }

  proposal.status = approved ? 'approved' : 'deprecated';
  proposal.reviewed_at = new Date().toISOString();
  proposal.review_notes = notes || null;

  if (approved) {
    approvedDeployments++;
  }

  return proposal;
}

// ─── Stats ───────────────────────────────────────────────────────────
export function getStats() {
  return {
    events_ingested: eventLog.length,
    patterns_detected: patterns.size,
    predictions_made: predictions.size,
    verticals_proposed: proposals.size,
    verticals_approved: [...proposals.values()].filter((p) => p.status === 'approved').length,
    verticals_deployed: [...proposals.values()].filter((p) => p.status === 'deployed').length,
    auto_deploy_enabled: approvedDeployments >= AUTO_DEPLOY_THRESHOLD,
    approved_deployments: approvedDeployments,
    uptime_since: startTime.toISOString(),
  };
}

// ─── Stream Health ───────────────────────────────────────────────────
export function getStreamHealth() {
  const now = Date.now();
  const health = {};

  for (const platform of VALID_PLATFORMS) {
    const platformEvents = eventLog.filter((e) => e.source_platform === platform);
    const last24h = platformEvents.filter(
      (e) => now - new Date(e.timestamp).getTime() < ONE_DAY_MS
    );
    const lastEvent = platformEvents.length > 0 ? platformEvents[platformEvents.length - 1] : null;

    const latency = lastEvent
      ? new Date(lastEvent.processed_at).getTime() - new Date(lastEvent.timestamp).getTime()
      : null;

    let status = 'unknown';
    if (lastEvent) {
      const age = now - new Date(lastEvent.timestamp).getTime();
      if (age < ONE_HOUR_MS) status = 'healthy';
      else if (age < ONE_DAY_MS) status = 'stale';
      else status = 'dead';
    }

    health[platform] = {
      last_event_at: lastEvent ? lastEvent.timestamp : null,
      event_count_24h: last24h.length,
      latency_ms: latency !== null ? Math.max(0, latency) : null,
      status,
    };
  }

  return health;
}

// ─── Vertical Proposer (Internal) ────────────────────────────────────
function proposeVertical(pattern) {
  const proposal = {
    proposal_id: uuidv4(),
    vertical_name: generateVerticalName(pattern),
    rationale: pattern.description,
    estimated_agents_needed: estimateAgentsNeeded(pattern),
    estimated_revenue_30d: estimateRevenue(pattern),
    confidence: pattern.confidence,
    genesis_intent: generateGenesisIntent(pattern),
    source_pattern_id: pattern.pattern_id,
    proposed_at: new Date().toISOString(),
    status: approvedDeployments >= AUTO_DEPLOY_THRESHOLD ? 'approved' : 'proposed',
    reviewed_at: null,
    review_notes: null,
  };

  proposals.set(proposal.proposal_id, proposal);
  return proposal;
}

function generateVerticalName(pattern) {
  const meta = pattern.metadata || {};
  if (meta.topic) return `${meta.topic}-specialist-network`;
  if (meta.category) return `${meta.category}-capability-hub`;
  return `${pattern.rule_name}-response-service`;
}

function estimateAgentsNeeded(pattern) {
  const meta = pattern.metadata || {};
  if (meta.agent_count) return Math.ceil(meta.agent_count / 3);
  if (meta.failed_matches) return Math.ceil(meta.failed_matches / 2);
  return 3;
}

function estimateRevenue(pattern) {
  const meta = pattern.metadata || {};
  const base = (meta.agent_count || meta.failed_matches || 5) * 50;
  return parseFloat((base * pattern.confidence).toFixed(2));
}

function generateGenesisIntent(pattern) {
  const meta = pattern.metadata || {};
  return {
    description: `Deploy vertical in response to: ${pattern.description}`,
    trigger_pattern: pattern.rule_name,
    target_domain: meta.topic || meta.category || 'general',
    estimated_agents: estimateAgentsNeeded(pattern),
    success_criteria: 'Reduce unmet demand by 50% within 30 days',
    monitoring: {
      track_metrics: ['demand_fulfillment_rate', 'agent_utilization', 'revenue_generated'],
      review_interval_days: 7,
    },
  };
}

const startTime = new Date();
