import path from "node:path";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { detectConflicts } from "./conflicts.js";
import { intentSchema, stateWriteSchema, thinkingParseSchema } from "./schemas.js";
import { createRedis, RedisStore } from "./store.js";
import { extractIntentFromThinking } from "./thinking.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function buildServer(store = new RedisStore(createRedis())) {
  const app = Fastify({ logger: true });

  app.register(fastifyStatic, {
    root: path.join(__dirname, "..", "public"),
    prefix: "/public/"
  });

  app.get("/health", async () => ({ ok: true }));

  app.get("/dashboard", async (_request, reply) => reply.sendFile("dashboard.html"));

  app.get("/state/:scope", async (request) => {
    const { scope } = request.params as { scope: string };
    return { state: await store.getState(scope) };
  });

  app.post("/state/:scope", async (request, reply) => {
    const { scope } = request.params as { scope: string };
    const state = stateWriteSchema.parse(request.body);
    reply.code(201);
    return { state: await store.writeState(scope, state) };
  });

  app.post("/intent", async (request, reply) => {
    const intent = intentSchema.parse(request.body);
    const active = await store.listIntents();
    const conflicts = detectConflicts(intent, active);

    await store.putIntent(intent);
    await Promise.all(conflicts.map((conflict) => store.publishConflict(conflict)));

    reply.code(201);
    return { intent, conflicts };
  });

  app.delete("/intent/:agentId", async (request) => {
    const { agentId } = request.params as { agentId: string };
    await store.deleteIntent(agentId);
    return { released: agentId };
  });

  app.get("/conflicts", async () => {
    const active = await store.listIntents();
    return {
      conflicts: active.flatMap((intent, index) => detectConflicts(intent, active.slice(index + 1)))
    };
  });

  app.get("/intents", async () => ({ intents: await store.listIntents() }));

  app.post("/thinking/parse", async (request) => {
    const parsed = thinkingParseSchema.parse(request.body);
    const intent = extractIntentFromThinking(parsed);
    return { intent };
  });

  app.get("/stream", async (_request, reply) => {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });
    reply.raw.write("event: ready\ndata: {}\n\n");

    const subscriber = store.subscribeToConflicts((conflict) => {
      reply.raw.write(`event: conflict\ndata: ${JSON.stringify(conflict)}\n\n`);
    });

    reply.raw.on("close", () => subscriber.disconnect());
  });

  app.addHook("onClose", async () => {
    await store.close();
  });

  return app;
}
