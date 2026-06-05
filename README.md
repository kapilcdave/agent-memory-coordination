# Agent Memory Coordination

A real-time memory and coordination layer for parallel AI agents.

## Features

- Redis-backed persistent state by semantic scope
- Intent declaration and release with TTL expiry
- Conflict detection for file collisions, semantic scope overlap, and dependency risk
- Server-sent event stream for live conflict notifications
- Thinking stream parser for extracting pre-tool-call intent signals
- Minimal MCP-compatible stdio wrapper for agent-native access
- Basic live dashboard at `/dashboard`

## Quick Start

```bash
npm install
REDIS_URL=redis://localhost:6379 npm run dev
```

The HTTP server defaults to `http://localhost:8080`.

## API

- `POST /intent`
- `DELETE /intent/:agentId`
- `GET /conflicts`
- `GET /state/:scope`
- `POST /state/:scope`
- `POST /thinking/parse`
- `GET /stream`
- `GET /dashboard`

## MCP

```bash
MEMORY_SERVER_URL=http://localhost:8080 npm run mcp
```

The wrapper exposes `declare_intent`, `release_intent`, `read_state`, and `write_state`.
