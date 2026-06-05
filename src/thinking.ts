import type { Intent } from "./schemas.js";
import { scopeFromText } from "./semantic.js";

export function extractIntentFromThinking(input: {
  agentId: string;
  text: string;
  files?: string[];
  timestamp?: number;
  ttl?: number;
}): Intent {
  const firstToolBoundary = input.text.search(/\b(tool|function|exec|apply_patch|read_file)\b/i);
  const thinking = firstToolBoundary >= 0 ? input.text.slice(0, firstToolBoundary) : input.text;
  const action = inferAction(thinking);

  return {
    agentId: input.agentId,
    scope: scopeFromText(thinking, input.files ?? []),
    files: input.files ?? [],
    action,
    thinking: thinking.trim(),
    timestamp: input.timestamp ?? Date.now(),
    ttl: input.ttl ?? 15 * 60 * 1000
  };
}

function inferAction(text: string): Intent["action"] {
  const lower = text.toLowerCase();
  if (/\b(test|spec|verify|coverage)\b/.test(lower)) return "test";
  if (/\b(fix|bug|repair|regression)\b/.test(lower)) return "fix";
  if (/\b(refactor|cleanup|restructure)\b/.test(lower)) return "refactor";
  return "implement";
}
