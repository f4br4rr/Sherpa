import { extractAssistantText } from "./client.js";

describe("extractAssistantText", () => {
  it("uses message.content when present", () => {
    const raw = {
      choices: [{ message: { role: "assistant", content: "Hello" } }],
    };
    expect(extractAssistantText(raw)).toBe("Hello");
  });

  it("falls back to message.reasoning when content is empty (Ollama / Qwen3)", () => {
    const raw = {
      choices: [
        {
          message: {
            role: "assistant",
            content: "",
            reasoning: "Think step by step.\n\nHi there.",
          },
        },
      ],
    };
    expect(extractAssistantText(raw)).toBe("Think step by step.\n\nHi there.");
  });
});
