import { isLocalOllamaBaseUrl } from "./env.js";

describe("isLocalOllamaBaseUrl", () => {
  it("matches default Ollama OpenAI base", () => {
    expect(isLocalOllamaBaseUrl("http://localhost:11434/v1")).toBe(true);
  });

  it("matches 127.0.0.1", () => {
    expect(isLocalOllamaBaseUrl("http://127.0.0.1:11434/v1")).toBe(true);
  });

  it("rejects NVIDIA integrate host", () => {
    expect(isLocalOllamaBaseUrl("https://integrate.api.nvidia.com/v1")).toBe(false);
  });
});
