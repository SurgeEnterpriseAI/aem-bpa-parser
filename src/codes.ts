import type { CodeInfo } from "./types.js";

/**
 * Pattern Detector codes documented by Adobe (experience-manager-pattern-detection docs).
 * `hours` is planning hours per finding before importance weighting; `cap` limits the hours for one code.
 * These are planning heuristics, not Adobe figures.
 */
export const BPA_CODES: Record<string, CodeInfo> = {
  ACV: { title: "Assets content validation (missing nodes or original renditions)", category: "Assets", hours: 0.05, cap: 40, automatable: "high", fix: "Repair or exclude affected assets before content transfer; the Content Transformer in CAM fixes many automatically." },
  CAV: { title: "Content in areas that break content classification", category: "Repository structure", hours: 0.5, cap: 80, automatable: "high", fix: "Move content out of /libs and other restricted areas; the Content Transformer can relocate it." },
  ECU: { title: "Content classification violations (extended)", category: "Repository structure", hours: 0.5, cap: 80, automatable: "high", fix: "Overlay or relocate instead of modifying protected nodes." },
  CCL: { title: "Custom client libraries", category: "Code & APIs", hours: 0.5, cap: 60, automatable: "partial", fix: "Serve client libraries through /etc.clientlibs proxies with allowProxy; check minification settings." },
  CCOM: { title: "Custom components", category: "Authoring UI", hours: 0.75, cap: 400, automatable: "partial", fix: "Review each custom component; re-base Foundation-derived ones on Core Components." },
  CDW: { title: "Custom Classic UI dialog widgets", category: "Authoring UI", hours: 4, cap: 300, automatable: "high", fix: "Rebuild as Granite UI widgets; Classic UI is not available on Cloud Service." },
  CIF: { title: "Classic Commerce Integration Framework", category: "Unsupported features", hours: 8, cap: 400, automatable: "low", fix: "Move to CIF with a GraphQL commerce backend." },
  CTEM: { title: "Custom templates", category: "Authoring UI", hours: 3, cap: 300, automatable: "partial", fix: "Convert static templates to editable templates under /conf." },
  DG: { title: "Development guideline deviations", category: "Code & APIs", hours: 1, cap: 120, automatable: "high", fix: "Fix per the finding subtype; most are mechanical code changes." },
  DM: { title: "Dynamic Media usage", category: "Assets", hours: 2, cap: 60, automatable: "low", fix: "Plan Dynamic Media configuration on Cloud Service and re-validate image presets." },
  DOPI: { title: "Deprecated ordered property indexes", category: "Repository structure", hours: 0.5, cap: 24, automatable: "high", fix: "Replace with Lucene indexes using the -custom-N naming convention." },
  FORMS: { title: "AEM Forms features that change or are unavailable", category: "Unsupported features", hours: 4, cap: 400, automatable: "low", fix: "Map each Forms feature to the Forms as a Cloud Service equivalent." },
  INS: { title: "Invalid namespaces", category: "Repository structure", hours: 0.5, cap: 24, automatable: "high", fix: "Register namespaces through repoinit or rename the nodes." },
  INST: { title: "Custom and third-party packages and bundles", category: "Code & APIs", hours: 1, cap: 120, automatable: "partial", fix: "Confirm each package has a Cloud Service compatible version and is deployed through Cloud Manager." },
  IOI: { title: "Imports of internal Oak packages", category: "Code & APIs", hours: 4, cap: 80, automatable: "partial", fix: "Use public JCR or Jackrabbit APIs." },
  LOCP: { title: "Packages writing to /libs", category: "Repository structure", hours: 2, cap: 80, automatable: "partial", fix: "Use overlays under /apps; /libs is read-only." },
  LUI: { title: "Legacy UI (Classic or Coral 2 dialogs)", category: "Authoring UI", hours: 2, cap: 400, automatable: "high", fix: "Convert dialogs to Coral 3 / Granite UI." },
  MI: { title: "Misconfigurations", category: "OSGi configuration", hours: 0.5, cap: 40, automatable: "high", fix: "Correct the configuration value flagged by the finding." },
  MSM: { title: "Multi Site Manager usage", category: "Authoring UI", hours: 0.25, cap: 60, automatable: "low", fix: "Validate live copy and rollout configurations after transfer." },
  NBCC: { title: "Non-backward-compatible node changes", category: "Repository structure", hours: 1, cap: 80, automatable: "partial", fix: "Re-apply customisations through supported extension points." },
  NCC: { title: "Non-backward-compatible changes", category: "Code & APIs", hours: 1, cap: 80, automatable: "partial", fix: "Re-apply customisations through supported extension points." },
  OAUI: { title: "OAuth-configured users that need migrating", category: "Security & auth", hours: 1, cap: 40, automatable: "partial", fix: "Recreate integrations with Adobe Developer Console OAuth server-to-server credentials." },
  OCU: { title: "Deprecated or removed components and APIs", category: "Code & APIs", hours: 1.5, cap: 200, automatable: "high", fix: "Replace with the API named in Adobe's deprecated and removed features list." },
  OU: { title: "Deprecated or removed APIs in use", category: "Code & APIs", hours: 1.5, cap: 200, automatable: "high", fix: "Replace with the API named in Adobe's deprecated and removed features list." },
  OID: { title: "Oak index definition issues", category: "Repository structure", hours: 2, cap: 80, automatable: "high", fix: "Convert with the Index Converter and follow the -custom-N naming convention." },
  PCX: { title: "Page complexity", category: "Repository structure", hours: 0.25, cap: 40, automatable: "partial", fix: "Reduce children per node and very large pages before transfer." },
  REP: { title: "Enabled replication agents", category: "Infrastructure", hours: 2, cap: 40, automatable: "high", fix: "Remove agents; Cloud Service publishes through Sling Content Distribution." },
  UMI: { title: "Modified OSGi configurations that break upgrades", category: "OSGi configuration", hours: 1, cap: 60, automatable: "high", fix: "Move configuration into the code base as .cfg.json files." },
  URC: { title: "Configurations on unsupported run modes", category: "OSGi configuration", hours: 0.5, cap: 40, automatable: "high", fix: "Use only author/publish and dev/stage/prod/rde run modes." },
  URS: { title: "Unsupported repository structure", category: "Repository structure", hours: 1, cap: 120, automatable: "high", fix: "Move /etc content to /conf or /var; the Content Transformer handles many cases." },
  WRK: { title: "Custom asset workflow models and launchers", category: "Assets", hours: 6, cap: 160, automatable: "low", fix: "Move to asset microservices processing profiles and post-processing workflows." },
};

/** Codes the Cloud Acceleration Manager Content Transformer can fix automatically (per Adobe docs). */
export const CONTENT_TRANSFORMER_CODES: ReadonlySet<string> = new Set(["ACV", "CAV", "DOPI", "OAUI", "PCX", "REP", "URS"]);

/** Adobe's Pattern Detector documentation page for a BPA code. */
export function patternDocUrl(code: string): string {
  return `https://experienceleague.adobe.com/en/docs/experience-manager-pattern-detection/table-of-contents/${code.toLowerCase()}`;
}
