import { buildDemoExportV1 } from "./demoExportV1.js";

describe("buildDemoExportV1", () => {
  it("emits exportSchemaVersion 1.0", () => {
    const ex = buildDemoExportV1({
      sessionId: "sid",
      ko_number: "KO40001",
      transcript: [{ role: "technician", content: "Hi" }],
      evaluation: {
        atsScores: { technicalKnowledge: 4, logicalThinking: 4, rootCause: 4 },
        weightedScore: 4,
        outcomeLabel: "Pass",
        coachingNotes: { overall: "ok" },
        learningBehavior: "good",
        gradingIntegrity: "complete",
      },
    });
    expect(ex.exportSchemaVersion).toBe("1.0");
    expect(ex.boundKoNumber).toBe("KO40001");
    expect(ex.transcript[0]?.authorRole).toBe("technician");
  });
});
