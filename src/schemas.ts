import { z } from "zod";

export const intentSchema = z.object({
  agentId: z.string().min(1),
  scope: z.string().min(1),
  files: z.array(z.string()).default([]),
  action: z.enum(["refactor", "implement", "fix", "test"]),
  thinking: z.string().default(""),
  timestamp: z.number().int().positive().default(() => Date.now()),
  ttl: z.number().int().positive().default(15 * 60 * 1000)
});

export const stateWriteSchema = z.object({
  agentId: z.string().min(1),
  data: z.unknown(),
  timestamp: z.number().int().positive().default(() => Date.now())
});

export const thinkingParseSchema = z.object({
  agentId: z.string().min(1),
  text: z.string().min(1),
  files: z.array(z.string()).default([]),
  timestamp: z.number().int().positive().default(() => Date.now()),
  ttl: z.number().int().positive().default(15 * 60 * 1000)
});

export type Intent = z.infer<typeof intentSchema>;
export type StateWrite = z.infer<typeof stateWriteSchema>;

export type Conflict = {
  type: "scope_overlap" | "file_collision" | "dependency_risk";
  agents: string[];
  scopes: string[];
  severity: "warn" | "block";
  suggestedResolution: string;
};

export type ScopeState = StateWrite & {
  scope: string;
};
