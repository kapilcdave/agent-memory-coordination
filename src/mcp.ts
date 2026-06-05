import { createInterface } from "node:readline";

const serverUrl = process.env.MEMORY_SERVER_URL ?? "http://localhost:8080";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
};

const tools = [
  {
    name: "declare_intent",
    description: "Declare an agent intent before acting.",
    inputSchema: {
      type: "object",
      required: ["agentId", "scope", "action"],
      properties: {
        agentId: { type: "string" },
        scope: { type: "string" },
        files: { type: "array", items: { type: "string" } },
        action: { type: "string", enum: ["refactor", "implement", "fix", "test"] },
        thinking: { type: "string" },
        ttl: { type: "number" }
      }
    }
  },
  {
    name: "release_intent",
    description: "Release an agent intent after completion.",
    inputSchema: { type: "object", required: ["agentId"], properties: { agentId: { type: "string" } } }
  },
  {
    name: "read_state",
    description: "Read persistent state for a semantic scope.",
    inputSchema: { type: "object", required: ["scope"], properties: { scope: { type: "string" } } }
  },
  {
    name: "write_state",
    description: "Write persistent state for a semantic scope.",
    inputSchema: {
      type: "object",
      required: ["scope", "agentId", "data"],
      properties: { scope: { type: "string" }, agentId: { type: "string" }, data: {} }
    }
  }
];

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });

rl.on("line", async (line) => {
  const request = JSON.parse(line) as JsonRpcRequest;
  const result = await handle(request);
  if (request.id !== undefined) {
    process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: request.id, result })}\n`);
  }
});

async function handle(request: JsonRpcRequest): Promise<unknown> {
  if (request.method === "initialize") {
    return {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "agent-memory-coordination", version: "0.1.0" }
    };
  }
  if (request.method === "tools/list") return { tools };
  if (request.method === "tools/call") return callTool(request.params ?? {});
  return {};
}

async function callTool(params: Record<string, unknown>): Promise<unknown> {
  const name = params.name as string;
  const args = (params.arguments ?? {}) as Record<string, unknown>;

  if (name === "declare_intent") return json("POST", "/intent", { ...args, timestamp: Date.now() });
  if (name === "release_intent") return json("DELETE", `/intent/${String(args.agentId)}`);
  if (name === "read_state") return json("GET", `/state/${encodeURIComponent(String(args.scope))}`);
  if (name === "write_state") {
    return json("POST", `/state/${encodeURIComponent(String(args.scope))}`, {
      agentId: args.agentId,
      data: args.data,
      timestamp: Date.now()
    });
  }
  throw new Error(`unknown tool: ${name}`);
}

async function json(method: string, pathname: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`${serverUrl}${pathname}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }]
  };
}
