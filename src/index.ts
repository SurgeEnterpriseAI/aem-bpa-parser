import { parseCsv } from "./csv.js";
import { BPA_CODES, CONTENT_TRANSFORMER_CODES, patternDocUrl } from "./codes.js";
import { estimate, sortFindings } from "./estimate.js";
import type { BpaFinding, BpaReport, BpaRow, BpaSummary, Category, CodeInfo, Severity } from "./types.js";

export * from "./types.js";
export { parseCsv, detectDelimiter } from "./csv.js";
export { BPA_CODES, CONTENT_TRANSFORMER_CODES, patternDocUrl } from "./codes.js";
export { estimate, sortFindings, AUTOMATION_SHARE, BASE_PROJECT_HOURS } from "./estimate.js";

/** Thrown when the input is empty or has no `code` and `importance` columns. */
export class BpaFormatError extends Error {
  override name = "BpaFormatError";
}

/** BPA importance -> severity and an effort weight. Unknown importance values count as ADVISORY. */
export const IMPORTANCE: Record<string, { severity: Severity; weight: number }> = {
  CRITICAL: { severity: "blocker", weight: 1.5 },
  MAJOR: { severity: "major", weight: 1 },
  ADVISORY: { severity: "minor", weight: 0.5 },
  INFO: { severity: "minor", weight: 0 },
};

const UNKNOWN_CODE: Omit<CodeInfo, "title"> = {
  category: "Code & APIs",
  hours: 1,
  cap: 80,
  automatable: "partial",
  fix: "Review against Adobe's Pattern Detector documentation for this code.",
};

/**
 * Read the rows of a BPA "Export to CSV" report (results.csv).
 * Columns per Adobe docs: code, type, subtype, importance, identifier, other, message, moreInfo, context.
 * Column order does not matter; names are matched case-insensitively. `\N` means "no data".
 * @throws BpaFormatError when the text is empty or has no `code` and `importance` columns.
 */
export function parseBpaRows(text: string): BpaRow[] {
  const rows = parseCsv(text.replace(/^﻿/, ""));
  if (rows.length === 0) throw new BpaFormatError("The file is empty.");
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const idx = { code: col("code"), type: col("type"), subtype: col("subtype"), importance: col("importance"), identifier: col("identifier"), message: col("message") };
  if (idx.code < 0 || idx.importance < 0) {
    throw new BpaFormatError("This does not look like a Best Practices Analyzer CSV. Expected columns named code and importance in the first row.");
  }
  const clean = (v: string | undefined) => (v === undefined || v === "\\N" ? "" : v.trim());
  return rows.slice(1).map((r) => ({
    code: clean(r[idx.code]).toUpperCase(),
    type: clean(r[idx.type]),
    subtype: clean(r[idx.subtype]),
    importance: clean(r[idx.importance]).toUpperCase(),
    identifier: clean(r[idx.identifier]),
    message: clean(r[idx.message]),
  }));
}

/** Group parsed rows by code into findings, with a summary and an effort estimate. */
export function analyseBpaRows(rows: BpaRow[]): BpaReport {
  type Acc = { count: number; severity: Severity; weighted: number; samples: BpaFinding["samples"] };
  const byCode = new Map<string, Acc>();
  const levels = new Map<string, Record<string, number>>();
  const sevRank: Record<Severity, number> = { blocker: 0, major: 1, minor: 2 };
  let system: string | undefined;

  for (const r of rows) {
    if (r.code === "ASO") {
      // ASO is system information, not a finding.
      if (system === undefined && r.message) system = r.message;
      continue;
    }
    if (!r.code) continue;
    const tally = levels.get(r.code) ?? {};
    const level = r.importance || "UNKNOWN";
    tally[level] = (tally[level] ?? 0) + 1;
    levels.set(r.code, tally);

    const imp = IMPORTANCE[r.importance] ?? IMPORTANCE.ADVISORY;
    if (imp.weight === 0) continue;
    const a = byCode.get(r.code) ?? { count: 0, severity: "minor" as Severity, weighted: 0, samples: [] };
    a.count++;
    a.weighted += imp.weight;
    if (sevRank[imp.severity] < sevRank[a.severity]) a.severity = imp.severity;
    if (a.samples.length < 5) a.samples.push({ path: r.identifier || r.subtype || r.type, excerpt: r.message.slice(0, 160) });
    byCode.set(r.code, a);
  }

  const findings: BpaFinding[] = [];
  for (const [code, a] of byCode) {
    const known = Object.prototype.hasOwnProperty.call(BPA_CODES, code);
    const info: CodeInfo = known ? BPA_CODES[code] : { ...UNKNOWN_CODE, title: `BPA pattern ${code}` };
    findings.push({
      code,
      title: `${code}: ${info.title}`,
      category: info.category,
      severity: a.severity,
      count: a.count,
      importance: levels.get(code) ?? {},
      hours: Math.round(Math.min(info.hours * a.weighted + 2, info.cap) * 10) / 10,
      automatable: info.automatable,
      contentTransformer: CONTENT_TRANSFORMER_CODES.has(code),
      fix: info.fix,
      docUrl: patternDocUrl(code),
      samples: a.samples,
      known,
    });
  }
  sortFindings(findings);

  const counted = findings.reduce((s, f) => s + f.count, 0);
  const bySeverity: Record<Severity, number> = { blocker: 0, major: 0, minor: 0 };
  const byCategory: Partial<Record<Category, number>> = {};
  for (const f of findings) {
    bySeverity[f.severity]++;
    byCategory[f.category] = (byCategory[f.category] ?? 0) + f.count;
  }
  const summary: BpaSummary = {
    rows: rows.length,
    counted,
    skipped: rows.length - counted,
    codes: findings.length,
    bySeverity,
    byCategory,
    components: byCode.get("CCOM")?.count ?? 0,
    templates: byCode.get("CTEM")?.count ?? 0,
    ...(system !== undefined ? { system } : {}),
  };
  return { findings, summary, estimate: estimate(findings) };
}

/**
 * Parse a Best Practices Analyzer CSV (or TSV) export into findings grouped by BPA code,
 * a summary and a planning effort range.
 * @throws BpaFormatError when the text is empty or is not a BPA export.
 */
export function parseBpaCsv(csv: string): BpaReport {
  return analyseBpaRows(parseBpaRows(csv));
}
