import {
  computeWeightedScore,
  extractJsonObject,
  isAllowedAtsScore,
  outcomeFromWeighted,
  roundToOneDecimal,
} from "./evaluator.js";

describe("evaluator helpers", () => {
  it("computes weighted score 40/35/25", () => {
    const w = computeWeightedScore({
      technicalKnowledge: 4,
      logicalThinking: 4,
      rootCause: 4,
    });
    expect(w).toBe(4);
  });

  it("passes at 4.0 boundary", () => {
    expect(outcomeFromWeighted(4.0)).toBe("Pass");
    expect(outcomeFromWeighted(3.99)).toBe("Needs Improvement");
  });

  it("validates allowlist scores", () => {
    expect(isAllowedAtsScore(3.5)).toBe(true);
    expect(isAllowedAtsScore(3.55)).toBe(false);
  });

  it("rounds to one decimal", () => {
    expect(roundToOneDecimal(3.499999)).toBe(3.5);
  });

  it("extracts JSON from fenced markdown", () => {
    const raw = extractJsonObject('Prefix\n```json\n{"a":1}\n```');
    expect(raw).toEqual({ a: 1 });
  });
});
