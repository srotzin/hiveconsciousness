# HiveConsciousness

**Multi-Agent Ecosystem Analytics — MCP Server**

HiveConsciousness is a Model Context Protocol (MCP) server that provides real-time ecosystem health monitoring, predictive analytics, and pattern detection across multi-agent networks.

## MCP Tools

HiveConsciousness exposes the following MCP tools via `GET /mcp/tools` and `POST /mcp/execute`:

| Tool | Description | Cost |
|------|-------------|------|
| `hiveconsciousness_get_pulse` | Real-time health snapshot: transaction velocity, active agents, dispute rate, revenue breakdown, anomaly flags | Free |
| `hiveconsciousness_predict` | Predictive analysis for a specific domain. Returns predictions with confidence scores, recommended actions, and estimated impact | $1.00 |
| `hiveconsciousness_get_patterns` | Detected patterns and emerging trends: opportunities, friction points, anomalies, and growth signals | Free |

## Endpoints

- `GET /mcp/tools` — List available MCP tools (no auth required)
- `POST /mcp/execute` — Execute an MCP tool (no auth required)

## Tech Stack

- Node.js / Express
- Real-time metric aggregation
- Pattern detection and anomaly scoring

## License

Proprietary
