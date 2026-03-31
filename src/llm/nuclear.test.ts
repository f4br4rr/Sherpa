import { isNuclearProposal } from "./nuclear.js";

describe("nuclear detector", () => {
  it("flags reimage", () => {
    expect(isNuclearProposal("Let's reimage the machine")).toBe(true);
  });

  it("flags re-image with hyphen", () => {
    expect(isNuclearProposal("We should re-image your laptop")).toBe(true);
  });

  it("ignores short text", () => {
    expect(isNuclearProposal("ok")).toBe(false);
  });

  it("ignores benign text", () => {
    expect(isNuclearProposal("Try restarting the Zoom client first.")).toBe(false);
  });
});
