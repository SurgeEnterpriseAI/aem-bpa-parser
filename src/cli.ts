#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { BpaFormatError, parseBpaCsv, type BpaReport } from "./index.js";

const USAGE = `Usage: aem-bpa-parser <report.csv> [--json]

Reads an AEM Best Practices Analyzer CSV export and prints findings grouped by BPA code.
  --json   print the full report as JSON
  -        read the CSV from standard input`;

function main(argv: string[]): number {
  const json = argv.includes("--json");
  if (argv.includes("-h") || argv.includes("--help")) {
    console.log(USAGE);
    return 0;
  }
  const files = argv.filter((a) => a !== "--json");
  if (files.length !== 1) {
    console.error(USAGE);
    return 2;
  }
  let text: string;
  try {
    text = readFileSync(files[0] === "-" ? 0 : files[0], "utf8");
  } catch (e) {
    console.error(`Cannot read ${files[0]}: ${(e as Error).message}`);
    return 2;
  }
  let report: BpaReport;
  try {
    report = parseBpaCsv(text);
  } catch (e) {
    if (e instanceof BpaFormatError) {
      console.error(e.message);
      return 1;
    }
    throw e;
  }
  console.log(json ? JSON.stringify(report, null, 2) : formatTable(report));
  return 0;
}

export function formatTable(report: BpaReport): string {
  const { findings, summary: s, estimate: e } = report;
  const head = ["Code", "Severity", "Count", "Hours", "Category", "Title"];
  const body = findings.map((f) => [f.code, f.severity, String(f.count), String(f.hours), f.category, f.title.slice(f.code.length + 2)]);
  const widths = head.map((h, i) => Math.max(h.length, ...body.map((r) => r[i].length)));
  const line = (r: string[]) => r.map((c, i) => (i === 2 || i === 3 ? c.padStart(widths[i]) : c.padEnd(widths[i]))).join("  ").trimEnd();
  const out = [
    line(head),
    line(widths.map((w) => "-".repeat(w))),
    ...body.map(line),
    "",
    `Rows: ${s.rows} (${s.counted} counted, ${s.skipped} skipped)  Codes: ${s.codes}  Blocker/major/minor codes: ${s.bySeverity.blocker}/${s.bySeverity.major}/${s.bySeverity.minor}`,
    `Remediation: ${e.remediationHours} h  Manual: ${e.manualWeeks[0]}-${e.manualWeeks[1]} weeks  Tool-assisted: ${e.assistedWeeks[0]}-${e.assistedWeeks[1]} weeks  Readiness: ${e.readiness}/100`,
  ];
  if (findings.length === 0) out.splice(0, 2, "No findings above INFO importance.");
  return out.join("\n");
}

process.exitCode = main(process.argv.slice(2));
