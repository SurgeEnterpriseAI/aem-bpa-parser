# aem-bpa-parser

Parse an Adobe Experience Manager **Best Practices Analyzer (BPA)** CSV report into findings grouped by BPA code, with severity, category, a summary and a planning effort range. TypeScript, zero runtime dependencies.

## What BPA is

The Best Practices Analyzer is Adobe's tool for checking an AEM 6.x instance before moving it to AEM as a Cloud Service. It runs on the existing instance, applies Adobe's Pattern Detector rules, and reports each finding with a pattern code (for example `CDW`, `OU`, `REP`) and an importance level (`CRITICAL`, `MAJOR`, `ADVISORY`, `INFO`). The report can be exported as CSV.

Adobe's documentation: [Using Best Practices Analyzer](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/migration-journey/cloud-migration/best-practices-analyzer/using-best-practices-analyzer).

This library reads that CSV export and turns thousands of rows into one line per code.

## Install

Not published to npm yet. Install from GitHub:

```sh
npm install github:SurgeEnterpriseAI/aem-bpa-parser
```

Or clone it and run the CLI with [tsx](https://github.com/privatenumber/tsx):

```sh
git clone https://github.com/SurgeEnterpriseAI/aem-bpa-parser.git
cd aem-bpa-parser
npm install
npx tsx src/cli.ts path/to/results.csv
```

Requires Node.js 18 or later.

## Usage

### Library

```ts
import { readFileSync } from "node:fs";
import { parseBpaCsv, BpaFormatError } from "aem-bpa-parser";

const report = parseBpaCsv(readFileSync("results.csv", "utf8"));

for (const f of report.findings) {
  console.log(f.code, f.severity, f.count, f.hours, f.docUrl);
}
console.log(report.summary.bySeverity, report.estimate.manualWeeks);
```

`parseBpaCsv(csv)` returns:

| Field | Contents |
| --- | --- |
| `findings[]` | One entry per BPA code: `code`, `title`, `category`, `severity` (worst importance seen), `count`, `importance` (rows per level), `hours`, `automatable`, `contentTransformer`, `fix`, `docUrl` (Adobe Pattern Detector page), up to 5 `samples`, `known`. Blockers first, then by hours. |
| `summary` | `rows`, `counted`, `skipped`, `codes`, `bySeverity`, `byCategory`, `components` (CCOM), `templates` (CTEM), `system` (the ASO row's message, usually the AEM version). |
| `estimate` | `readiness` (0-100), `remediationHours`, `manualWeeks` and `assistedWeeks` ranges, `blockers`. |

It throws `BpaFormatError` when the input is empty or has no `code` and `importance` columns.

Lower-level exports: `parseCsv`, `parseBpaRows`, `analyseBpaRows`, `estimate`, `BPA_CODES`, `IMPORTANCE`, `CONTENT_TRANSFORMER_CODES`, `patternDocUrl`.

### CLI

```sh
npx tsx src/cli.ts results.csv          # summary table
npx tsx src/cli.ts results.csv --json   # full report as JSON
cat results.csv | npx tsx src/cli.ts -  # read from stdin
```

Exit code 1 when the file is not a BPA export, 2 for a usage or read error.

## Example output

From the synthetic fixture in [`tests/fixtures/sample-bpa.csv`](tests/fixtures/sample-bpa.csv):

```
Code  Severity  Count  Hours  Category              Title
----  --------  -----  -----  --------------------  ----------------------------------------------------------------
CDW   blocker       2     12  Authoring UI          Custom Classic UI dialog widgets
WRK   blocker       1     11  Assets                Custom asset workflow models and launchers
OU    blocker       1    4.3  Code & APIs           Deprecated or removed APIs in use
LUI   major         3      8  Authoring UI          Legacy UI (Classic or Coral 2 dialogs)
CTEM  major         2      8  Authoring UI          Custom templates
REP   major         1      4  Infrastructure        Enabled replication agents
OID   major         1      4  Repository structure  Oak index definition issues
CCOM  major         2    3.5  Authoring UI          Custom components
URS   major         1      3  Repository structure  Unsupported repository structure
URC   major         1    2.5  OSGi configuration    Configurations on unsupported run modes
DG    minor         1    2.5  Code & APIs           Development guideline deviations
XYZ   minor         1    2.5  Code & APIs           BPA pattern XYZ
ACV   minor         2    2.1  Assets                Assets content validation (missing nodes or original renditions)
PCX   minor         1    2.1  Repository structure  Page complexity

Rows: 23 (20 counted, 3 skipped)  Codes: 14  Blocker/major/minor codes: 3/7/4
Remediation: 69.5 h  Manual: 5-8 weeks  Tool-assisted: 4.5-7 weeks  Readiness: 18/100
```

## How it reads the file

- Columns follow Adobe's CSV export: `code, type, subtype, importance, identifier, other, message, moreInfo, context`. Columns are matched by name in any order; only `code` and `importance` are required.
- RFC 4180 quoting (commas, escaped quotes and newlines inside quotes), CRLF or LF, a UTF-8 BOM, and tab-separated files are accepted. The literal `\N` is treated as empty.
- `ASO` rows are system information and are not counted. `INFO` rows are not counted as findings but appear in each finding's `importance` tally.
- Importance maps to severity: `CRITICAL` to blocker, `MAJOR` to major, `ADVISORY` (and unknown values) to minor.
- Hours per code = min(hours per finding x weighted count + 2, cap), where `CRITICAL` weighs 1.5, `MAJOR` 1 and `ADVISORY` 0.5.
- The estimate adds 164 hours of fixed project overhead (Cloud Manager setup, content transfer runs, regression QA, cutover) and returns a range of 0.85x to 1.4x, in 40-hour weeks rounded to half weeks. `assistedWeeks` assumes a share of each code's work is done with tooling (75% / 40% / 10% for high / partial / low automatable).

## Limits

- The hours, weights, caps and readiness score are planning heuristics, not Adobe figures. Tune them for your team before quoting from them.
- The code table covers 31 Pattern Detector codes. Codes it does not know still appear, with generic defaults and `known: false`.
- It reads the CSV export only, not the BPA HTML report or the Cloud Acceleration Manager view.
- Counts are rows in the report. BPA can report the same underlying item under more than one code.
- The whole file is read into memory; very large reports need enough RAM for the text and the parsed rows.

## Built by Surge Migrate

This parser is extracted from Surge Migrate's AEM to Cloud Service tooling. Surge Migrate also runs a [free in-browser BPA readiness scan](https://www.surgemigrate.com/readiness-scan/) built on the same logic.

## Disclaimer

Not affiliated with, endorsed by or sponsored by Adobe. Adobe, Adobe Experience Manager and AEM are trademarks of Adobe Inc.

## License

[MIT](LICENSE), copyright 2026 Surge Software Solutions Pvt Ltd.
