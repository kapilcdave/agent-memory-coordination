import { describe, expect, it } from "vitest";
import { detectConflicts } from "./conflicts.js";
import type { Intent } from "./schemas.js";

const base: Intent = {
  agentId: "agent-a",
  scope: "auth module",
  files: ["src/auth.ts"],
  action: "implement",
  thinking: "",
  timestamp: 1,
  ttl: 1000
};

describe("detectConflicts", () => {
  it("blocks shared file collisions", () => {
    const conflicts = detectConflicts(
      { ...base, agentId: "agent-b", files: ["src/auth.ts"] },
      [base]
    );
    expect(conflicts[0]?.type).toBe("file_collision");
    expect(conflicts[0]?.severity).toBe("block");
  });

  it("warns on semantic scope overlap", () => {
    const conflicts = detectConflicts(
      { ...base, agentId: "agent-b", scope: "authentication", files: ["src/session.ts"] },
      [base]
    );
    expect(conflicts[0]?.type).toBe("scope_overlap");
    expect(conflicts[0]?.severity).toBe("warn");
  });

  it("warns on dependency risk from filenames", () => {
    const conflicts = detectConflicts(
      { ...base, agentId: "agent-b", scope: "payments", files: ["src/auth/session.ts"] },
      [{ ...base, scope: "session" }]
    );
    expect(conflicts[0]?.type).toBe("dependency_risk");
  });
});
