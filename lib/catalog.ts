/** No default medical ranges: bounds must come from the user's own report. */
export const CATALOG_VERSION = "2026-10-19.1";
export const catalog = {
  hemoglobin: {
    label: "Hemoglobin",
    aliases: ["hemoglobin", "haemoglobin", "hgb", "hb"],
    canonical: "g/dL",
    units: { "g/dL": 1, "g/L": 0.1 },
  },
  glucose: {
    label: "Glucose",
    aliases: ["glucose", "blood glucose"],
    canonical: "mg/dL",
    units: { "mg/dL": 1, "mg/L": 0.1 },
  },
  wbc: {
    label: "White blood cells",
    aliases: ["wbc", "white blood cells", "white blood cell count"],
    canonical: "10^9/L",
    units: { "10^9/L": 1, "K/uL": 1 },
  },
  platelets: {
    label: "Platelets",
    aliases: ["platelets", "platelet count", "plt"],
    canonical: "10^9/L",
    units: { "10^9/L": 1, "K/uL": 1 },
  },
  creatinine: {
    label: "Creatinine",
    aliases: ["creatinine", "serum creatinine"],
    canonical: "mg/dL",
    units: { "mg/dL": 1, "mg/L": 0.1 },
  },
  hba1c: {
    label: "HbA1c",
    aliases: ["hba1c", "hemoglobin a1c", "haemoglobin a1c"],
    canonical: "%",
    units: { "%": 1 },
  },
} as const;
export type TestId = keyof typeof catalog;
export const testIds = Object.keys(catalog) as TestId[];
export function identifyTest(name: string): TestId | undefined {
  return testIds.find(
    (id) =>
      (catalog[id].aliases as readonly string[]).includes(
        name.trim().toLowerCase(),
      ) || id === name.trim().toLowerCase(),
  );
}
export function factorFor(test: TestId, unit: string): number | undefined {
  return (catalog[test].units as Record<string, number>)[unit];
}
export const sources = [
  {
    id: "lab-results",
    title: "Understanding laboratory results",
    publisher: "MedlinePlus · U.S. National Library of Medicine",
    url: "https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/",
    purpose:
      "Why reference intervals differ and why a result alone is not a diagnosis.",
    reviewed: "2026-10-19",
  },
  {
    id: "emergencies",
    title: "Recognizing medical emergencies",
    publisher: "MedlinePlus · U.S. National Library of Medicine",
    url: "https://medlineplus.gov/ency/article/001927.htm",
    purpose:
      "Examples of emergency warning signs; not an exhaustive triage protocol.",
    reviewed: "2026-10-19",
  },
];
export const emergencyExamples = [
  "Chest pain or pressure",
  "Severe difficulty breathing",
  "Sudden trouble speaking, facial droop, or one-sided weakness",
  "Fainting, severe confusion, or inability to wake",
  "Uncontrolled bleeding or severe allergic reaction",
  "Immediate risk of harming yourself or someone else",
];
