import type { Conflict, Intent } from "./schemas.js";
import { cosineSimilarity } from "./semantic.js";

export function detectConflicts(candidate: Intent, active: Intent[]): Conflict[] {
  const conflicts: Conflict[] = [];

  for (const intent of active) {
    if (intent.agentId === candidate.agentId) continue;

    const agents = [candidate.agentId, intent.agentId];
    const scopes = [candidate.scope, intent.scope];
    const sharedFiles = candidate.files.filter((file) => intent.files.includes(file));

    if (sharedFiles.length > 0) {
      conflicts.push({
        type: "file_collision",
        agents,
        scopes,
        severity: "block",
        suggestedResolution: `Avoid shared files: ${sharedFiles.join(", ")}`
      });
      continue;
    }

    if (cosineSimilarity(candidate.scope, intent.scope) > 0.85) {
      conflicts.push({
        type: "scope_overlap",
        agents,
        scopes,
        severity: "warn",
        suggestedResolution: `Coordinate scope ownership between ${agents.join(" and ")} before acting.`
      });
      continue;
    }

    if (hasDependencyRisk(candidate, intent)) {
      conflicts.push({
        type: "dependency_risk",
        agents,
        scopes,
        severity: "warn",
        suggestedResolution: "Review dependency direction and sequence the work if shared imports are likely."
      });
    }
  }

  return conflicts;
}

function hasDependencyRisk(left: Intent, right: Intent): boolean {
  return left.files.some((file) => fileMentionsScope(file, right.scope)) ||
    right.files.some((file) => fileMentionsScope(file, left.scope));
}

function fileMentionsScope(file: string, scope: string): boolean {
  const normalizedFile = file.toLowerCase();
  return scope
    .toLowerCase()
    .split(/\s+/)
    .filter((part) => part.length > 2)
    .some((part) => normalizedFile.includes(part));
}
