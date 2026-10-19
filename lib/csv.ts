import { parse } from "csv-parse/sync";
import { identifyTest } from "./catalog";
import { labSchema, type Lab } from "./schema";
export const CSV_TEMPLATE =
  "date,test,value,unit,low,high,lab\n2026-10-01,Hemoglobin,12.1,g/dL,12,16,Example Laboratory\n";
export function parseLabCsv(text: string): Lab[] {
  if (new TextEncoder().encode(text).length > 100000)
    throw new Error("CSV must be 100 KB or smaller.");
  let rows: string[][];
  try {
    rows = parse(text, {
      bom: true,
      skip_empty_lines: true,
      trim: true,
      max_record_size: 5000,
    }) as string[][];
  } catch {
    throw new Error(
      "Malformed CSV. Use the template, with quoted fields if they contain commas.",
    );
  }
  if (rows.length < 2 || rows.length > 201)
    throw new Error("CSV must have a header and 1–200 data rows.");
  const headers = ["date", "test", "value", "unit", "low", "high", "lab"];
  if (rows[0].join(",") !== headers.join(","))
    throw new Error(`Header must be exactly: ${headers.join(",")}`);
  const seen = new Set<string>();
  return rows.slice(1).map((r, i) => {
    if (r.length !== 7) throw new Error(`Row ${i + 2}: expected 7 columns.`);
    const [date, testName, value, unit, low, high, lab] = r;
    const test = identifyTest(testName);
    if (!test)
      throw new Error(
        `Row ${i + 2}: unsupported test name. Use a catalog name; no fuzzy matching is performed.`,
      );
    const numeric = (s: string) =>
      /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(s) ? Number(s) : NaN;
    const result = labSchema.safeParse({
      id: crypto.randomUUID(),
      date,
      test,
      value: numeric(value),
      unit,
      low: low === "" ? null : numeric(low),
      high: high === "" ? null : numeric(high),
      lab,
      note: "",
    });
    if (!result.success)
      throw new Error(
        `Row ${i + 2}: ${result.error.issues.map((x) => x.message).join(" ")}`,
      );
    const fingerprint = [date, test, unit, lab.toLowerCase()].join("|");
    if (seen.has(fingerprint))
      throw new Error(
        `Row ${i + 2}: duplicate test/date/unit/lab. Split distinct draws with distinct report labels.`,
      );
    seen.add(fingerprint);
    return result.data;
  });
}
export function duplicateLab(a: Lab, b: Lab) {
  return (
    a.date === b.date &&
    a.test === b.test &&
    a.unit === b.unit &&
    a.lab.trim().toLowerCase() === b.lab.trim().toLowerCase()
  );
}
