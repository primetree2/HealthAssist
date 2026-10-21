import { analysisSchema } from "./contracts";
import type { Analysis } from "./contracts";
const KEY = "healthassist.saved.v2";
const TTL = 30 * 24 * 60 * 60 * 1000;
export function loadSaved(): Analysis[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw || raw.length > 1_000_000) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.slice(0, 10).flatMap((item) => {
      const p = analysisSchema.safeParse(item);
      return p.success && Date.now() - Date.parse(p.data.created_at) < TTL
        ? [p.data]
        : [];
    });
  } catch {
    return [];
  }
}
export function saveAnalysis(analysis: Analysis) {
  const items = [
    analysis,
    ...loadSaved().filter((a) => a.id !== analysis.id),
  ].slice(0, 10);
  const raw = JSON.stringify(items);
  if (raw.length > 1_000_000)
    throw new Error(
      "Device storage limit reached. Export this report or delete older saved reports.",
    );
  localStorage.setItem(KEY, raw);
  return items;
}
export function deleteSaved(id?: string) {
  const items = id ? loadSaved().filter((a) => a.id !== id) : [];
  if (items.length) localStorage.setItem(KEY, JSON.stringify(items));
  else localStorage.removeItem(KEY);
  return items;
}
export function downloadFile(name: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function csvCell(value: unknown) {
  let s = String(value ?? "");
  if (/^[\s]*[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function exportCSV(analysis: Analysis) {
  const rows = [
    [
      "Test",
      "Reported result",
      "Reported unit",
      "Lab interval",
      "Status",
      "Equivalent value",
      "Equivalent unit",
      "Page",
      "Verified",
    ],
    ...analysis.observations.map((o) => [
      o.raw.name,
      o.raw.result,
      o.raw.unit,
      o.raw.reference_text,
      o.status,
      o.canonical_value,
      o.canonical_unit,
      o.raw.page,
      o.raw.user_verified ? "yes" : "no",
    ]),
  ];
  downloadFile(
    "healthassist-results.csv",
    "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n"),
    "text/csv;charset=utf-8",
  );
}
