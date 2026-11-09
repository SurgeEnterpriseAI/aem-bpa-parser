export type Severity = "blocker" | "major" | "minor";

export type Category =
  | "Code & APIs"
  | "Repository structure"
  | "OSGi configuration"
  | "Authoring UI"
  | "Assets"
  | "Infrastructure"
  | "Security & auth"
  | "Unsupported features";

/** How much of the fix is usually mechanical (scriptable or tool-assisted). */
export type Automatable = "high" | "partial" | "low";

export interface CodeInfo {
  title: string;
  category: Category;
  /** Planning hours per finding, before importance weighting. */
  hours: number;
  /** Upper limit on planning hours for one code. */
  cap: number;
  automatable: Automatable;
  /** One sentence: what to do on AEM as a Cloud Service. */
  fix: string;
}

/** One row of the BPA CSV export, with the columns this library uses. `\N` becomes "". */
export interface BpaRow {
  code: string;
  type: string;
  subtype: string;
  importance: string;
  identifier: string;
  message: string;
}

export interface BpaSample {
  /** The row's identifier, or its subtype/type when the identifier is empty. */
  path: string;
  /** The row's message, cut to 160 characters. */
  excerpt: string;
}

export interface BpaFinding {
  /** BPA pattern code, e.g. "CDW". */
  code: string;
  /** "CODE: title". Unknown codes get "CODE: BPA pattern CODE". */
  title: string;
  category: Category;
  /** Worst importance seen for this code: CRITICAL -> blocker, MAJOR -> major, ADVISORY -> minor. */
  severity: Severity;
  /** Rows counted for this code (INFO rows are not counted). */
  count: number;
  /** Rows per BPA importance level, including INFO rows that were not counted. */
  importance: Record<string, number>;
  /** Planning hours: min(hours per finding x importance-weighted count + 2, cap), one decimal. */
  hours: number;
  automatable: Automatable;
  /** True when Cloud Acceleration Manager's Content Transformer can fix this code automatically. */
  contentTransformer: boolean;
  fix: string;
  /** Adobe Pattern Detector documentation for this code. */
  docUrl: string;
  /** Up to five example rows. */
  samples: BpaSample[];
  /** False when the code is not in the built-in table (generic defaults were used). */
  known: boolean;
}

export interface Estimate {
  /** 0-100, higher is closer to Cloud Service ready. A heuristic score. */
  readiness: number;
  /** Sum of finding hours. */
  remediationHours: number;
  /** Engineer-week range for a manual migration: findings plus fixed project overhead. */
  manualWeeks: [number, number];
  /** Range when the automatable share is done with tooling. A planning target, not a guarantee. */
  assistedWeeks: [number, number];
  blockers: number;
}

export interface BpaSummary {
  /** Data rows in the file (header excluded). */
  rows: number;
  /** Rows counted as findings. */
  counted: number;
  /** Rows skipped: ASO system information, INFO importance, or no code. */
  skipped: number;
  /** Distinct codes with at least one counted row. */
  codes: number;
  /** Findings (codes) per severity. */
  bySeverity: Record<Severity, number>;
  /** Counted rows per category. */
  byCategory: Partial<Record<Category, number>>;
  /** Counted CCOM rows (custom components). */
  components: number;
  /** Counted CTEM rows (custom templates). */
  templates: number;
  /** Message of the first ASO (system information) row, usually the AEM version. */
  system?: string;
}

export interface BpaReport {
  /** Findings grouped by code, blockers first, then by hours. */
  findings: BpaFinding[];
  summary: BpaSummary;
  estimate: Estimate;
}
