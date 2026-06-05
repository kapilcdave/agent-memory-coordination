const synonyms: Record<string, string[]> = {
  auth: ["authentication", "authorization", "login", "session", "identity", "oauth"],
  payments: ["billing", "checkout", "invoice", "subscription", "stripe"],
  api: ["endpoint", "route", "controller", "handler", "server"],
  ui: ["frontend", "component", "view", "dashboard", "page"],
  test: ["spec", "coverage", "verification", "qa"]
};

export function tokenizeScope(scope: string): string[] {
  const base = scope
    .toLowerCase()
    .replace(/[^a-z0-9/_.-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const expanded = new Set(base);
  for (const token of base) {
    for (const [root, related] of Object.entries(synonyms)) {
      if (token === root || related.includes(token)) {
        expanded.add(root);
        related.forEach((value) => expanded.add(value));
      }
    }
  }
  return [...expanded];
}

export function cosineSimilarity(left: string, right: string): number {
  const leftTokens = tokenizeScope(left);
  const rightTokens = tokenizeScope(right);
  const vocab = new Set([...leftTokens, ...rightTokens]);

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (const token of vocab) {
    const leftCount = leftTokens.filter((candidate) => candidate === token).length;
    const rightCount = rightTokens.filter((candidate) => candidate === token).length;
    dot += leftCount * rightCount;
    leftMagnitude += leftCount * leftCount;
    rightMagnitude += rightCount * rightCount;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export function scopeFromText(text: string, files: string[] = []): string {
  const lower = text.toLowerCase();
  const candidates = [
    "auth",
    "payments",
    "api layer",
    "state store",
    "dashboard",
    "mcp",
    "tests"
  ];

  const matched = candidates.find((candidate) => tokenizeScope(candidate).some((token) => lower.includes(token)));
  if (matched) return matched;

  const fileScope = files.find(Boolean)?.split("/").filter(Boolean).slice(0, 2).join("/");
  return fileScope || "general";
}
