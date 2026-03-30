import { randomInt } from "node:crypto";

/**
 * Curated given names when a KO has no `persona`. Shipped with the app; extend for locale coverage.
 * Combined with {@link SYNTHETIC_LAST_NAMES} at session bind time (one draw each, independent).
 */
export const SYNTHETIC_FIRST_NAMES = [
  "Alex",
  "Jordan",
  "Sam",
  "Taylor",
  "Morgan",
  "Casey",
  "Riley",
  "Jamie",
  "Avery",
  "Drew",
  "Priya",
  "Marcus",
  "Elena",
  "Diego",
  "Kim",
  "Wei",
  "Omar",
  "Sofia",
  "Nina",
  "James",
  "Lisa",
  "Ryan",
  "Zoe",
  "Caleb",
] as const;

/**
 * Curated family names; paired with {@link SYNTHETIC_FIRST_NAMES} via random index each session.
 */
export const SYNTHETIC_LAST_NAMES = [
  "Rivera",
  "Lee",
  "Patel",
  "Brooks",
  "Chen",
  "Nguyen",
  "Foster",
  "Ortiz",
  "Gallagher",
  "Kim",
  "Okonkwo",
  "Haddad",
  "Nakamura",
  "Silva",
  "Murphy",
  "Santos",
  "Cohen",
  "Park",
  "Singh",
  "Volkov",
  "Hansen",
  "Adebayo",
  "Carvalho",
  "Walsh",
] as const;

/**
 * Random full name for ticket header when the bound KO omits `persona`.
 * Draw once per scenario start; keep stable for the session.
 */
export function pickSyntheticDisplayName(): string {
  const first =
    SYNTHETIC_FIRST_NAMES[randomInt(SYNTHETIC_FIRST_NAMES.length)];
  const last = SYNTHETIC_LAST_NAMES[randomInt(SYNTHETIC_LAST_NAMES.length)];
  return `${first} ${last}`;
}

/**
 * Ticket header display name: KO `persona` when non-empty after trim; otherwise {@link pickSyntheticDisplayName}.
 */
export function resolveTicketDisplayName(persona: string | undefined): string {
  const trimmed = persona?.trim();
  if (trimmed) return trimmed;
  return pickSyntheticDisplayName();
}
