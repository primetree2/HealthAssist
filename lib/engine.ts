import { catalog, factorFor } from "./catalog";
import type { Checkin, Journal, Lab } from "./schema";
export type RangeStatus =
  | "Below report range"
  | "Within report range"
  | "Above report range"
  | "No report range";
export function classify(lab: Lab): RangeStatus {
  if (lab.low === null || lab.high === null) return "No report range";
  return lab.value < lab.low
    ? "Below report range"
    : lab.value > lab.high
      ? "Above report range"
      : "Within report range";
}
export function canonical(lab: Lab) {
  const factor = factorFor(lab.test, lab.unit);
  if (factor === undefined) throw new Error("Unsupported unit");
  return {
    value: lab.value * factor,
    low: lab.low === null ? null : lab.low * factor,
    high: lab.high === null ? null : lab.high * factor,
    unit: catalog[lab.test].canonical,
  };
}
export function latestLabs(labs: Lab[]) {
  const dates = labs.reduce<Record<string, string>>((a, l) => {
    if (!a[l.test] || l.date > a[l.test]) a[l.test] = l.date;
    return a;
  }, {});
  return labs
    .filter((l) => l.date === dates[l.test])
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
/** Same-day duplicates cannot establish sequence. Different labs/methods may not be comparable. */
export function comparison(lab: Lab, labs: Lab[]) {
  const earlier = labs
    .filter((l) => l.test === lab.test && l.date < lab.date)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!earlier.length) return null;
  const prev = earlier[0];
  if (earlier.filter((l) => l.date === prev.date).length > 1)
    return {
      blocked:
        "Multiple earlier results on the same date; comparison withheld.",
    };
  if (labs.filter((l) => l.test === lab.test && l.date === lab.date).length > 1)
    return { blocked: "Multiple results on this date; comparison withheld." };
  if (prev.lab.trim().toLowerCase() !== lab.lab.trim().toLowerCase())
    return {
      blocked:
        "Different report/lab labels; comparison withheld because methods may differ.",
    };
  const a = canonical(lab),
    b = canonical(prev);
  const delta = a.value - b.value;
  return {
    previous: prev,
    delta,
    percent: b.value === 0 ? null : (delta / b.value) * 100,
    unit: a.unit,
    rangeChanged: a.low !== b.low || a.high !== b.high,
  };
}
export function recentCheckins(checkins: Checkin[], asOf: string, days = 30) {
  const end = Date.parse(`${asOf}T12:00:00Z`);
  return checkins
    .filter((c) => {
      const age = (end - Date.parse(`${c.date}T12:00:00Z`)) / 86400000;
      return age >= 0 && age < days;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
export function recurring(checkins: Checkin[], asOf: string) {
  const recent = recentCheckins(checkins, asOf);
  const counts = new Map<string, { entries: number; dates: Set<string> }>();
  for (const c of recent)
    for (const s of c.symptoms) {
      const v = counts.get(s) || { entries: 0, dates: new Set<string>() };
      v.entries++;
      v.dates.add(c.date);
      counts.set(s, v);
    }
  return [...counts]
    .map(([symptom, v]) => ({ symptom, count: v.entries, days: v.dates.size }))
    .sort((a, b) => b.days - a.days || b.count - a.count);
}
export function questions(journal: Journal, asOf: string) {
  const items: string[] = [];
  const repeat = recurring(journal.checkins, asOf).find((r) => r.days >= 2);
  if (repeat)
    items.push(
      `I logged ${repeat.symptom.toLowerCase()} on ${repeat.days} separate days in the last 30 days. What should we discuss or monitor?`,
    );
  for (const l of latestLabs(journal.labs)) {
    const status = classify(l);
    if (status === "Above report range" || status === "Below report range")
      items.push(
        `My ${catalog[l.test].label} was ${l.value} ${l.unit} on ${l.date} (${l.lab}), ${status.toLowerCase()}. What does this mean in my context?`,
      );
  }
  items.push(
    "Do any of my medicines, supplements, or recent illnesses affect these observations?",
    "What changes should prompt me to seek medical help, and when should I follow up?",
  );
  return items.slice(0, 7);
}
export function visitSummary(journal: Journal, asOf: string) {
  const lines = [
    `HEALTH ASSIST — PERSONAL VISIT NOTES`,
    `Prepared ${asOf}. User-entered, unverified information. Not a diagnosis or clinical record.`,
    `All saved observations included below; displayed recurrences use a rolling 30-day window.`,
    ``,
    `QUESTIONS`,
    ...questions(journal, asOf).map((q, i) => `${i + 1}. ${q}`),
    ``,
    `OBSERVATIONS`,
    ...journal.checkins
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(
        (c) =>
          `${c.date} | ${c.symptoms.join(", ")} | self-rated intensity ${c.severity}/10 | warning-sign response: ${c.safety}\n${c.note || "(no note)"}`,
      ),
    ``,
    `LAB ENTRIES`,
    ...journal.labs
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(
        (l) =>
          `${l.date} | ${catalog[l.test].label} | ${l.value} ${l.unit} | ${classify(l)} | Report bounds: ${l.low ?? "not provided"}–${l.high ?? "not provided"} | ${l.lab}${l.note ? ` | ${l.note}` : ""}`,
      ),
    ``,
    `LIMITATIONS`,
    `No diagnosis, treatment advice, medical clearance, or complete emergency assessment. A within-range result does not rule out illness. Ask a qualified clinician to interpret results. No automatic PDF/OCR interpretation.`,
    `If you may be having a medical emergency, contact local emergency services now. Do not wait for this app.`,
  ];
  return lines.join("\n");
}
