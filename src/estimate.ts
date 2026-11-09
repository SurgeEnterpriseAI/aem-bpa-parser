import type { Automatable, Estimate, Severity } from "./types.js";

/** Share of effort that tooling takes on, by how automatable a code is. Planning assumption. */
export const AUTOMATION_SHARE: Record<Automatable, number> = { high: 0.75, partial: 0.4, low: 0.1 };

/** Fixed project overhead hours that exist in every migration regardless of findings. */
export const BASE_PROJECT_HOURS = {
  cloudManagerSetup: 24,
  contentTransferRuns: 40,
  regressionQa: 60,
  cutoverAndHypercare: 40,
};

const HOURS_PER_WEEK = 40;
const SEVERITY_ORDER: Record<Severity, number> = { blocker: 0, major: 1, minor: 2 };

export interface Estimable {
  severity: Severity;
  hours: number;
  count: number;
  automatable: Automatable;
}

/** Blockers first, then most hours first. Sorts in place and returns the array. */
export function sortFindings<T extends { severity: Severity; hours: number }>(findings: T[]): T[] {
  return findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.hours - a.hours);
}

/** Readiness score and engineer-week ranges for a set of findings. Planning heuristics. */
export function estimate(findings: Estimable[]): Estimate {
  const remediationHours = round1(findings.reduce((s, f) => s + f.hours, 0));
  const base = Object.values(BASE_PROJECT_HOURS).reduce((s, h) => s + h, 0);
  const manual = remediationHours + base;
  const saved = findings.reduce((s, f) => s + f.hours * AUTOMATION_SHARE[f.automatable], 0);
  // Review time for tool output is charged back at 20% of what the tool saved.
  const assisted = manual - saved * 0.8;

  const blockers = findings.filter((f) => f.severity === "blocker").length;
  const majors = findings.filter((f) => f.severity === "major").length;
  const minors = findings.length - blockers - majors;
  // Penalties scale with distinct issue types and, logarithmically, with volume.
  const volume = Math.log10(1 + findings.reduce((s, f) => s + f.count, 0));
  const penalty = blockers * 12 + majors * 5 + minors * 1.5 + volume * 4;
  const readiness = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  return {
    readiness,
    remediationHours,
    manualWeeks: [weeks(manual * 0.85), weeks(manual * 1.4)],
    assistedWeeks: [weeks(assisted * 0.85), weeks(assisted * 1.4)],
    blockers,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const weeks = (hours: number) => Math.max(1, Math.round((hours / HOURS_PER_WEEK) * 2) / 2);
