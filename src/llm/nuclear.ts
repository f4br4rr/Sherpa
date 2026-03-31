/**
 * Lightweight nuclear / disproportionate remediation detector (MVP keyword pass).
 * Single list owner should curate this list per release — architecture doc.
 */

const NUCLEAR_PATTERNS: RegExp[] = [
  /\bre-?image\b/i,
  /\breimage\b/i,
  /\bfull\s+os\s+reinstall\b/i,
  /\breinstall\s+(windows|the\s+os|macos)\b/i,
  /\bclean\s+install\b/i,
  /\bfresh\s+install\b/i,
  /\bformat\s+(the\s+)?(disk|drive|hd|ssd)\b/i,
  /\bwipe\s+(the\s+)?(disk|drive|machine|pc|computer|laptop)\b/i,
  /\bfactory\s+reset\b/i,
  /\berase\s+and\s+reinstall\b/i,
  /\bnuke\s+the\s+(pc|machine|laptop|disk)\b/i,
];

export function isNuclearProposal(text: string): boolean {
  const t = text.trim();
  if (t.length < 4) return false;
  return NUCLEAR_PATTERNS.some((re) => re.test(t));
}
