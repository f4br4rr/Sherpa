import {
  SYNTHETIC_FIRST_NAMES,
  SYNTHETIC_LAST_NAMES,
  pickSyntheticDisplayName,
  resolveTicketDisplayName,
} from "./pickDisplayName.js";

describe("pickDisplayName", () => {
  it("resolveTicketDisplayName uses trimmed persona when present", () => {
    expect(resolveTicketDisplayName("Karen - Accounting")).toBe(
      "Karen - Accounting",
    );
    expect(resolveTicketDisplayName("  Pat  ")).toBe("Pat");
  });

  it("resolveTicketDisplayName picks synthetic when persona empty or whitespace", () => {
    const a = resolveTicketDisplayName("");
    const b = resolveTicketDisplayName("   ");
    const c = resolveTicketDisplayName(undefined);
    for (const name of [a, b, c]) {
      const parts = name.split(" ");
      expect(parts.length).toBe(2);
      expect(SYNTHETIC_FIRST_NAMES).toContain(parts[0]);
      expect(SYNTHETIC_LAST_NAMES).toContain(parts[1]);
    }
  });

  it("pickSyntheticDisplayName returns first + last from catalogs", () => {
    const name = pickSyntheticDisplayName();
    const [first, last] = name.split(" ");
    expect(SYNTHETIC_FIRST_NAMES).toContain(first);
    expect(SYNTHETIC_LAST_NAMES).toContain(last);
  });
});
