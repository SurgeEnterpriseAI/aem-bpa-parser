import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BpaFormatError, BPA_CODES, estimate, parseBpaCsv, parseBpaRows, parseCsv } from "../src/index.js";

const fixture = readFileSync(fileURLToPath(new URL("./fixtures/sample-bpa.csv", import.meta.url)), "utf8");

describe("parseCsv", () => {
  const csv = [
    "code,type,subtype,importance,identifier,other,message,moreInfo,context",
    'CDW,widget,\\N,MAJOR,/apps/a/dialog,\\N,"Classic dialog, with comma",\\N,"{""a"":1}"',
    'REP,agent,\\N,MAJOR,"/etc/x\nsecond line",\\N,"Enabled agent",\\N,\\N',
    "",
  ].join("\r\n");

  it("handles quoted commas, escaped quotes, CRLF and quoted newlines", () => {
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(3);
    expect(rows[1][6]).toBe("Classic dialog, with comma");
    expect(rows[1][8]).toBe('{"a":1}');
    expect(rows[2][4]).toBe("/etc/x\nsecond line");
  });
  it("accepts tab-separated input", () => {
    const rows = parseCsv("code\timportance\nCDW\tMAJOR");
    expect(rows).toEqual([["code", "importance"], ["CDW", "MAJOR"]]);
  });
});

describe("parseBpaRows", () => {
  it("maps columns by name, strips \\N and the BOM, and upper-cases code and importance", () => {
    const rows = parseBpaRows("﻿Importance,Message,Code\nmajor,\\N,cdw");
    expect(rows).toEqual([{ code: "CDW", type: "", subtype: "", importance: "MAJOR", identifier: "", message: "" }]);
  });
  it("rejects files that are not BPA reports", () => {
    expect(() => parseBpaRows("name,email\nA,B")).toThrow(BpaFormatError);
    expect(() => parseBpaRows("")).toThrow(BpaFormatError);
  });
});

describe("parseBpaCsv on the synthetic fixture", () => {
  const report = parseBpaCsv(fixture);
  const byCode = Object.fromEntries(report.findings.map((f) => [f.code, f]));

  it("skips ASO and INFO-only rows but records INFO counts", () => {
    expect(byCode.ASO).toBeUndefined();
    expect(byCode.CCOM.count).toBe(2);
    expect(byCode.CCOM.importance).toEqual({ INFO: 2, MAJOR: 2 });
    expect(report.summary.system).toBe("AEM 6.5.21.0 (synthetic sample)");
    expect(report.summary.rows).toBe(23);
    expect(report.summary.counted).toBe(20);
    expect(report.summary.skipped).toBe(3);
  });
  it("takes the worst importance per code", () => {
    expect(byCode.CDW.severity).toBe("blocker");
    expect(byCode.CDW.count).toBe(2);
    expect(byCode.LUI.severity).toBe("major");
    expect(byCode.ACV.severity).toBe("minor");
  });
  it("computes hours as min(hours x weighted count + 2, cap)", () => {
    // CDW: 4 h x (1.5 + 1) + 2 = 12
    expect(byCode.CDW.hours).toBe(12);
    // ACV: 0.05 h x (0.5 + 0.5) + 2 = 2.05 -> 2.1
    expect(byCode.ACV.hours).toBe(2.1);
    // LUI: 2 h x 3 + 2 = 8
    expect(byCode.LUI.hours).toBe(8);
  });
  it("orders blockers first, then by hours", () => {
    const sev = report.findings.map((f) => f.severity);
    expect(sev.indexOf("major")).toBeGreaterThan(sev.lastIndexOf("blocker"));
    expect(sev.indexOf("minor")).toBeGreaterThan(sev.lastIndexOf("major"));
    // Blockers: CDW 12 h, WRK 6 x 1.5 + 2 = 11 h, OU 1.5 x 1.5 + 2 = 4.3 h
    expect(report.findings.slice(0, 3).map((f) => f.code)).toEqual(["CDW", "WRK", "OU"]);
  });
  it("gives unknown codes generic defaults", () => {
    expect(byCode.XYZ.known).toBe(false);
    expect(byCode.XYZ.title).toBe("XYZ: BPA pattern XYZ");
    expect(byCode.XYZ.category).toBe("Code & APIs");
  });
  it("adds doc links and Content Transformer flags", () => {
    expect(byCode.REP.contentTransformer).toBe(true);
    expect(byCode.CDW.contentTransformer).toBe(false);
    expect(byCode.CDW.docUrl).toBe("https://experienceleague.adobe.com/en/docs/experience-manager-pattern-detection/table-of-contents/cdw");
  });
  it("summarises severities, categories, components and templates", () => {
    expect(report.summary.codes).toBe(report.findings.length);
    expect(report.summary.bySeverity.blocker).toBe(3);
    expect(report.summary.components).toBe(2);
    expect(report.summary.templates).toBe(2);
    expect(report.summary.byCategory["Authoring UI"]).toBe(2 + 2 + 3 + 2);
  });
  it("returns an effort range", () => {
    const e = report.estimate;
    expect(e.blockers).toBe(3);
    expect(e.manualWeeks[0]).toBeLessThanOrEqual(e.manualWeeks[1]);
    expect(e.assistedWeeks[1]).toBeLessThanOrEqual(e.manualWeeks[1]);
    expect(e.readiness).toBeGreaterThanOrEqual(0);
    expect(e.readiness).toBeLessThan(100);
  });
});

describe("estimate", () => {
  it("is 100 with no findings and still counts fixed project overhead", () => {
    const e = estimate([]);
    expect(e.readiness).toBe(100);
    expect(e.remediationHours).toBe(0);
    // 164 base hours: 0.85x -> 3.5 weeks, 1.4x -> 5.5 weeks
    expect(e.manualWeeks).toEqual([3.5, 5.5]);
  });
  it("has a category and fix for every built-in code", () => {
    for (const [code, info] of Object.entries(BPA_CODES)) {
      expect(info.fix.length, code).toBeGreaterThan(10);
      expect(info.cap, code).toBeGreaterThan(0);
    }
  });
});
