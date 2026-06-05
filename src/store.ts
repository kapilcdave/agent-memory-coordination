import { Redis } from "ioredis";
import type { Conflict, Intent, ScopeState, StateWrite } from "./schemas.js";

const intentKey = (agentId: string) => `intent:${agentId}`;
const stateKey = (scope: string) => `state:${scope}`;

export class RedisStore {
  constructor(
    private readonly redis: Redis,
    private readonly publisher: Redis = redis
  ) {}

  async close(): Promise<void> {
    this.redis.disconnect();
    if (this.publisher !== this.redis) this.publisher.disconnect();
  }

  async getState(scope: string): Promise<ScopeState | null> {
    const raw = await this.redis.get(stateKey(scope));
    return raw ? JSON.parse(raw) as ScopeState : null;
  }

  async writeState(scope: string, value: StateWrite): Promise<ScopeState> {
    const record = { ...value, scope };
    await this.redis.set(stateKey(scope), JSON.stringify(record));
    return record;
  }

  async putIntent(intent: Intent): Promise<void> {
    await this.redis.set(intentKey(intent.agentId), JSON.stringify(intent), "PX", intent.ttl);
  }

  async deleteIntent(agentId: string): Promise<void> {
    await this.redis.del(intentKey(agentId));
  }

  async listIntents(): Promise<Intent[]> {
    const keys = await this.redis.keys("intent:*");
    if (keys.length === 0) return [];
    const values = await this.redis.mget(...keys);
    return values.filter((value): value is string => Boolean(value)).map((value) => JSON.parse(value) as Intent);
  }

  async publishConflict(conflict: Conflict): Promise<void> {
    await this.publisher.publish("conflicts", JSON.stringify(conflict));
  }

  subscribeToConflicts(onConflict: (conflict: Conflict) => void): Redis {
    const subscriber = this.redis.duplicate();
    subscriber.subscribe("conflicts").catch((error: unknown) => {
      console.error("conflict subscription failed", error);
    });
    subscriber.on("message", (_channel: string, payload: string) => onConflict(JSON.parse(payload) as Conflict));
    return subscriber;
  }
}

export function createRedis(url = process.env.REDIS_URL ?? "redis://localhost:6379"): Redis {
  return new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true
  });
}
