// Research-backed set of phrases that read as generic AI filler regardless of context — the
// "swap the client's name and it still reads naturally" tell. Not exhaustive, but each one
// shows up repeatedly in write-ups on why AI copy sounds generic (see the quality-audit plan).
const CRUTCH_PHRASES = [
  'cutting-edge', 'tailored solution', 'tailored to your needs', 'we look forward to partnering',
  "in today's fast-paced", "in today's digital age", 'leverage', 'seamless', 'seamlessly',
  'robust', 'best-in-class', 'game-changing', 'game changer', 'unparalleled', 'state-of-the-art',
  'synergy', 'holistic approach', 'world-class', 'innovative solution', 'take your business to the next level',
  'unlock your potential', 'unlock the full potential', 'streamline your', 'elevate your',
  'bring your vision to life', 'exceed your expectations', 'one-stop solution', 'end-to-end solution',
] as const

export type SpecificityFinding = { field: string; phrase: string }

/** Deterministic, mechanical check — not another LLM judgment call, which would be subject to
 * the exact unreliability it exists to catch. Recursively scans every string field for a known
 * list of AI-crutch phrases and returns exactly where each one was found. */
export function findCrutchPhrases(content: unknown, path = ''): SpecificityFinding[] {
  const findings: SpecificityFinding[] = []
  if (typeof content === 'string') {
    const lower = content.toLowerCase()
    for (const phrase of CRUTCH_PHRASES) {
      if (lower.includes(phrase)) findings.push({ field: path || 'content', phrase })
    }
  } else if (Array.isArray(content)) {
    content.forEach((item, i) => findings.push(...findCrutchPhrases(item, `${path}[${i}]`)))
  } else if (content && typeof content === 'object') {
    for (const key of Object.keys(content as Record<string, unknown>)) {
      findings.push(...findCrutchPhrases((content as Record<string, unknown>)[key], path ? `${path}.${key}` : key))
    }
  }
  return findings
}
