import test from "node:test";
import assert from "node:assert/strict";
import {
  canonical,
  classify,
  comparison,
  latestLabs,
  questions,
  recurring,
  visitSummary,
} from "../lib/engine";
import {
  checkinSchema,
  dateSchema,
  emptyJournal,
  journalSchema,
  labSchema,
  today,
  type Checkin,
  type Lab,
} from "../lib/schema";
import { identifyTest } from "../lib/catalog";
import { parseLabCsv, duplicateLab } from "../lib/csv";
const lab = (overrides: Partial<Lab> = {}): Lab => ({
  id: "a",
  date: "2026-01-12",
  test: "hemoglobin",
  value: 12,
  unit: "g/dL",
  low: 12,
  high: 16,
  lab: "Lab A",
  note: "",
  ...overrides,
});
const check = (overrides: Partial<Checkin> = {}): Checkin => ({
  id: "c",
  date: "2026-01-12",
  symptoms: ["Fatigue"],
  severity: 4,
  note: "",
  safety: "no",
  ...overrides,
});
test("range boundaries are inclusive, not diagnostic normality", () => {
  assert.equal(classify(lab()), "Within report range");
  assert.equal(classify(lab({ value: 16 })), "Within report range");
  assert.equal(classify(lab({ value: 11.999 })), "Below report range");
  assert.equal(classify(lab({ value: 16.001 })), "Above report range");
  assert.equal(classify(lab({ low: null, high: null })), "No report range");
});
test("exact aliases only, unknown/fuzzy matches are not accepted", () => {
  assert.equal(identifyTest(" HGB "), "hemoglobin");
  assert.equal(identifyTest("HbA1c"), "hba1c");
  assert.equal(identifyTest("random hemoglobin result"), undefined);
  assert.equal(identifyTest("glucose fasting estimate"), undefined);
});
test("explicit mass concentration scaling converts value AND intervals", () => {
  assert.deepEqual(
    canonical(lab({ unit: "g/L", value: 120, low: 120, high: 160 })),
    { value: 12, low: 12, high: 16, unit: "g/dL" },
  );
  assert.equal(
    canonical(lab({ test: "wbc", unit: "K/uL", value: 6 })).value,
    6,
  );
});
test("unsupported units fail closed", () => {
  assert.equal(labSchema.safeParse(lab({ unit: "mmol/L" })).success, false);
  assert.throws(() => canonical(lab({ unit: "made-up" })));
});
test("arithmetic comparison is chronological, scaled, and range-aware", () => {
  const previous = lab({
    id: "b",
    date: "2026-01-01",
    value: 130,
    unit: "g/L",
    low: 120,
    high: 160,
  });
  const now = lab({ value: 12, low: 11, high: 16 });
  const c = comparison(now, [now, previous]);
  assert.ok(c && !("blocked" in c));
  assert.equal(c.delta, -1);
  assert.equal(c.rangeChanged, true);
  assert.ok(Math.abs(c.percent! - -100 / 13) < 1e-9);
});
test("prior zero never produces infinite percentage", () => {
  const c = comparison(lab(), [lab({ id: "b", date: "2026-01-01", value: 0 })]);
  assert.ok(c && !("blocked" in c));
  assert.equal(c.percent, null);
});
test("different labs and ambiguous draws block comparison", () => {
  const now = lab();
  const prev = lab({ id: "b", date: "2026-01-01", lab: "Other lab" });
  assert.ok("blocked" in comparison(now, [prev])!);
  assert.ok(
    "blocked" in
      comparison(now, [
        lab({ id: "b", date: "2026-01-01" }),
        lab({ id: "c", date: "2026-01-01" }),
      ])!,
  );
  assert.ok(
    "blocked" in
      comparison(now, [
        now,
        lab({ id: "x" }),
        lab({ id: "b", date: "2026-01-01" }),
      ])!,
  );
});
test("unrelated tests and future entries never become a prior result", () => {
  assert.equal(
    comparison(lab(), [
      lab({ date: "2026-02-01" }),
      lab({ test: "glucose", date: "2026-01-01", unit: "mg/dL" }),
    ]),
    null,
  );
});
test("latest per analyte uses dates, not insertion order", () => {
  const old = lab({ id: "old", date: "2026-01-01" });
  assert.equal(latestLabs([lab(), old])[0].id, "a");
});
test("rolling window excludes future and day 30; counts distinct days", () => {
  const r = recurring(
    [
      check(),
      check({ id: "same" }),
      check({ id: "past", date: "2025-12-14" }),
      check({ id: "old", date: "2025-12-13" }),
      check({ id: "future", date: "2026-01-13" }),
    ],
    "2026-01-12",
  );
  assert.deepEqual(r, [{ symptom: "Fatigue", count: 3, days: 2 }]);
});
test("visit brief uses prior history without disease inference", () => {
  const j = {
    ...emptyJournal(),
    checkins: [check(), check({ id: "b", date: "2026-01-11" })],
    labs: [lab({ value: 11 })],
  };
  const q = questions(j, "2026-01-12");
  assert.match(q[0], /2 separate days/);
  assert.ok(q.some((q) => q.includes("11 g/dL")));
  assert.match(visitSummary(j, "2026-01-12"), /Not a diagnosis/);
  assert.ok(!visitSummary(j, "2026-01-12").includes("anemia"));
});
test("real dates only, no future dates, no type coercion", () => {
  assert.equal(dateSchema.safeParse("2026-02-30").success, false);
  assert.equal(dateSchema.safeParse("2099-01-01").success, false);
  assert.equal(dateSchema.safeParse(today()).success, true);
  assert.equal(labSchema.safeParse(lab({ value: NaN })).success, false);
  assert.equal(labSchema.safeParse(lab({ value: Infinity })).success, false);
  assert.equal(labSchema.safeParse({ ...lab(), value: "12" }).success, false);
});
test("partial or reversed intervals rejected; empty intervals permitted", () => {
  assert.equal(labSchema.safeParse(lab({ low: null })).success, false);
  assert.equal(labSchema.safeParse(lab({ low: 16, high: 12 })).success, false);
  assert.equal(labSchema.safeParse(lab({ low: 12, high: 12 })).success, false);
  assert.equal(
    labSchema.safeParse(lab({ low: null, high: null })).success,
    true,
  );
});
test("check-in validates observations, scale, and required safety response", () => {
  assert.ok(checkinSchema.safeParse(check()).success);
  assert.equal(checkinSchema.safeParse(check({ severity: 11 })).success, false);
  assert.equal(checkinSchema.safeParse(check({ symptoms: [] })).success, false);
  assert.equal(
    checkinSchema.safeParse({ ...check(), safety: "" }).success,
    false,
  );
});
test("journal rejects unknown fields, duplicate IDs, and incompatible versions", () => {
  assert.equal(
    journalSchema.safeParse({ ...emptyJournal(), foo: 1 }).success,
    false,
  );
  assert.equal(
    journalSchema.safeParse({ ...emptyJournal(), checkins: [check(), check()] })
      .success,
    false,
  );
  assert.equal(
    journalSchema.safeParse({ ...emptyJournal(), version: 2 }).success,
    false,
  );
});
const header = "date,test,value,unit,low,high,lab\n";
test("CSV supports quoting and empty reference bounds", () => {
  const rows = parseLabCsv(header + '2026-01-01,Hb,120,g/L,,,"Lab, East"\n');
  assert.equal(rows[0].lab, "Lab, East");
  assert.equal(rows[0].low, null);
  assert.equal(rows[0].value, 120);
});
test("CSV rejects inequality, nonnumeric and injected spreadsheet values", () => {
  for (const v of ["<12", ">12", "-1", "NaN", "=2+2", "12foo", "0x12"])
    assert.throws(() =>
      parseLabCsv(header + `2026-01-01,Hb,${v},g/dL,12,16,Lab\n`),
    );
});
test("CSV import is strict and atomic", () => {
  assert.throws(() =>
    parseLabCsv(
      header +
        "2026-01-01,Hb,12,g/dL,12,16,Lab\n2026-01-01,Unknown,12,g/dL,12,16,Lab\n",
    ),
  );
  assert.throws(() => parseLabCsv("test,value\nHb,12"));
  assert.throws(() =>
    parseLabCsv(
      header +
        "2026-01-01,Hb,12,g/dL,12,16,Lab\n2026-01-01,Hb,13,g/dL,12,16,Lab\n",
    ),
  );
  assert.throws(() => parseLabCsv("a".repeat(100001)));
});
test("CSV cardinality and unit limits are enforced", () => {
  assert.throws(() => parseLabCsv(header));
  assert.throws(() =>
    parseLabCsv(header + "2026-01-01,Hb,12,mmol/L,12,16,Lab\n"),
  );
  assert.throws(() =>
    parseLabCsv(
      header + Array(201).fill("2026-01-01,Hb,12,g/dL,12,16,Lab").join("\n"),
    ),
  );
  assert.equal(duplicateLab(lab(), lab({ lab: " LAB A " })), true);
});
test("metamorphic: scaling values and bounds preserves all classifications", () => {
  for (let value = 0; value < 250; value += 0.7) {
    assert.equal(
      classify(lab({ value: value / 10 })),
      classify(lab({ value, unit: "g/L", low: 120, high: 160 })),
    );
  }
});
test("latest-date ties are preserved instead of choosing an arbitrary result", () => {
  const a = lab({ id: "a" }),
    b = lab({ id: "b", value: 11 });
  assert.equal(
    latestLabs([a, b, lab({ id: "old", date: "2026-01-01" })]).length,
    2,
  );
});
