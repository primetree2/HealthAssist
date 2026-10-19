import { type Journal, today } from "./schema";
export function demoJournal(): Journal {
  const daysAgo = (n: number) => {
    const d = new Date(`${today()}T12:00:00`);
    d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  return {
    version: 1,
    checkins: [
      {
        id: "demo-c1",
        date: daysAgo(0),
        symptoms: ["Fatigue"],
        severity: 4,
        note: "A quieter afternoon. Noticed tiredness after a busy week; I want to mention it at my next appointment.",
        safety: "no",
      },
      {
        id: "demo-c2",
        date: daysAgo(3),
        symptoms: ["Fatigue", "Sleep difficulty"],
        severity: 5,
        note: "Slept less than usual. No conclusions yet—just keeping a record.",
        safety: "no",
      },
      {
        id: "demo-c3",
        date: daysAgo(8),
        symptoms: ["Headache"],
        severity: 3,
        note: "Afternoon headache. Added a note so I can remember the timing.",
        safety: "no",
      },
      {
        id: "demo-c4",
        date: daysAgo(12),
        symptoms: ["Fatigue"],
        severity: 3,
        note: "Tired in the evening.",
        safety: "no",
      },
    ],
    labs: [
      {
        id: "demo-l1",
        date: daysAgo(2),
        test: "hemoglobin",
        value: 11.8,
        unit: "g/dL",
        low: 12,
        high: 16,
        lab: "Fictional Demo Lab",
        note: "Synthetic result and example interval—not a recommended range.",
      },
      {
        id: "demo-l2",
        date: daysAgo(2),
        test: "glucose",
        value: 92,
        unit: "mg/dL",
        low: 70,
        high: 99,
        lab: "Fictional Demo Lab",
        note: "Synthetic data. Fasting context not established.",
      },
      {
        id: "demo-l3",
        date: daysAgo(2),
        test: "wbc",
        value: 6.4,
        unit: "10^9/L",
        low: 4,
        high: 11,
        lab: "Fictional Demo Lab",
        note: "Synthetic data.",
      },
      {
        id: "demo-l4",
        date: daysAgo(45),
        test: "hemoglobin",
        value: 12.4,
        unit: "g/dL",
        low: 12,
        high: 16,
        lab: "Fictional Demo Lab",
        note: "Synthetic prior result.",
      },
    ],
  };
}
