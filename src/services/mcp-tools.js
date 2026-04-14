/**
 * HiveConsciousness — MCP Tool Definitions
 *
 * Exposes consciousness capabilities as MCP-compatible tools
 * for agent-to-agent discovery and invocation.
 */

import { getPulse, predict, getPatterns } from './consciousness-engine.js';

export const MCP_TOOLS = [
  {
    name: 'hiveconsciousness_get_pulse',
    description: 'Get real-time ecosystem health snapshot including transaction velocity, active agents, dispute rate, revenue by platform, and anomaly flags.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async () => {
      return getPulse();
    },
  },
  {
    name: 'hiveconsciousness_predict',
    description: 'Request predictive analysis for a specific domain. Returns predictions with confidence scores, recommended actions, and estimated revenue impact. Cost: $1.00 per call.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          enum: ['construction', 'compute', 'legal', 'finance', 'general'],
          description: 'Domain to analyze',
        },
        horizon_days: {
          type: 'number',
          enum: [30, 60, 90],
          description: 'Prediction horizon in days',
        },
        focus: {
          type: 'string',
          description: 'Optional focus area within the domain',
        },
      },
      required: ['domain', 'horizon_days'],
    },
    handler: async (input) => {
      return predict(input);
    },
  },
  {
    name: 'hiveconsciousness_get_patterns',
    description: 'Get all detected patterns and emerging trends across the Hive ecosystem, including opportunities, friction points, anomalies, and growth signals.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async () => {
      return getPatterns();
    },
  },
];

export function getMCPToolManifest() {
  return MCP_TOOLS.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  }));
}

export async function executeMCPTool(toolName, input) {
  const tool = MCP_TOOLS.find((t) => t.name === toolName);
  if (!tool) {
    throw new Error(`Unknown MCP tool: ${toolName}`);
  }
  return tool.handler(input || {});
}
