import type { Net } from '../engine/net.ts'
import type { Layout } from '../engine/layout.ts'

// Placement-rule conformance checks. Filled in from RULES.md.
export function ruleChecks(_net: Net, _lay: Layout): { failures: string[]; notes: string[] } {
  return { failures: [], notes: [] }
}
