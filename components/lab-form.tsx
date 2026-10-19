"use client";
import { useState, type FormEvent } from "react";
import * as I from "./icons";
import { catalog, testIds, type TestId } from "@/lib/catalog";
import { labSchema, errorMessage, today, type Lab } from "@/lib/schema";
import { CSV_TEMPLATE, duplicateLab, parseLabCsv } from "@/lib/csv";
import { download } from "./ui";
export default function LabForm({
  busy,
  existing,
  onSave,
  onError,
}: {
  busy: boolean;
  existing: Lab[];
  onSave: (labs: Lab[]) => Promise<boolean>;
  onError: (s: string) => void;
}) {
  const [tab, setTab] = useState<"manual" | "csv">("manual");
  const [test, setTest] = useState<TestId>("hemoglobin");
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<Lab[] | null>(null);
  const [reviewed, setReviewed] = useState(false);
  function ensureUnique(labs: Lab[]) {
    if (labs.some((l) => existing.some((e) => duplicateLab(l, e))))
      throw new Error(
        "An entry already exists for this test, date, unit, and lab label. Delete it first to correct it, or use a distinct report label for a separate draw.",
      );
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const n = (key: string) =>
      String(f.get(key) || "").trim() === "" ? null : Number(f.get(key));
    try {
      const lab = labSchema.parse({
        id: crypto.randomUUID(),
        date: f.get("date"),
        test,
        value: n("value"),
        unit: f.get("unit"),
        low: n("low"),
        high: n("high"),
        lab: f.get("lab"),
        note: String(f.get("note") || ""),
      });
      ensureUnique([lab]);
      if (!f.get("review"))
        throw new Error("Check the values against the original report first.");
      if (await onSave([lab])) {
        form.reset();
        setTest("hemoglobin");
      }
    } catch (err) {
      onError(errorMessage(err));
    }
  }
  function review() {
    try {
      const rows = parseLabCsv(csv);
      ensureUnique(rows);
      setPreview(rows);
      setReviewed(false);
      onError("");
    } catch (e) {
      setPreview(null);
      onError(errorMessage(e));
    }
  }
  async function importRows() {
    if (!preview || !reviewed) return;
    try {
      ensureUnique(preview);
      if (await onSave(preview)) {
        setPreview(null);
        setCsv("");
        setReviewed(false);
      }
    } catch (e) {
      onError(errorMessage(e));
    }
  }
  return (
    <section className="card lab-form">
      <div className="form-tabs" role="tablist" aria-label="Entry method">
        <button
          id="manual-tab"
          role="tab"
          aria-selected={tab === "manual"}
          aria-controls="lab-entry-panel"
          tabIndex={tab === "manual" ? 0 : -1}
          onKeyDown={(e) => {
            if (["ArrowRight", "ArrowLeft"].includes(e.key)) {
              e.preventDefault();
              setTab("csv");
              document.getElementById("csv-tab")?.focus();
            }
          }}
          onClick={() => setTab("manual")}
        >
          <I.Plus size={17} />
          Single result
        </button>
        <button
          id="csv-tab"
          role="tab"
          aria-selected={tab === "csv"}
          aria-controls="lab-entry-panel"
          tabIndex={tab === "csv" ? 0 : -1}
          onKeyDown={(e) => {
            if (["ArrowRight", "ArrowLeft"].includes(e.key)) {
              e.preventDefault();
              setTab("manual");
              document.getElementById("manual-tab")?.focus();
            }
          }}
          onClick={() => setTab("csv")}
        >
          <I.Upload size={17} />
          Import CSV
        </button>
      </div>
      <div
        id="lab-entry-panel"
        role="tabpanel"
        aria-labelledby={tab === "manual" ? "manual-tab" : "csv-tab"}
      >
        {tab === "manual" ? (
          <form onSubmit={submit} className="lab-entry-fields">
            <div className="form-grid three">
              <div>
                <label htmlFor="lab-test">Test</label>
                <select
                  id="lab-test"
                  name="test"
                  value={test}
                  onChange={(e) => setTest(e.target.value as TestId)}
                  disabled={busy}
                >
                  {testIds.map((t) => (
                    <option value={t} key={t}>
                      {catalog[t].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="lab-date">Collection date</label>
                <input
                  id="lab-date"
                  name="date"
                  type="date"
                  defaultValue={today()}
                  min="1900-01-01"
                  max={today()}
                  required
                  disabled={busy}
                />
              </div>
              <div>
                <label htmlFor="lab-name">Lab / report label</label>
                <input
                  id="lab-name"
                  name="lab"
                  maxLength={80}
                  required
                  placeholder="e.g. City Lab · morning draw"
                  disabled={busy}
                />
              </div>
            </div>
            <div className="form-grid four">
              <div>
                <label htmlFor="lab-value">Reported value</label>
                <input
                  id="lab-value"
                  name="value"
                  type="number"
                  step="any"
                  min={0}
                  max={1e9}
                  required
                  disabled={busy}
                  placeholder="Exact value"
                />
              </div>
              <div>
                <label htmlFor="lab-unit">Report unit</label>
                <select id="lab-unit" name="unit" key={test} disabled={busy}>
                  {Object.keys(catalog[test].units).map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="lab-low">
                  Lower bound <span className="optional">optional</span>
                </label>
                <input
                  id="lab-low"
                  name="low"
                  type="number"
                  step="any"
                  min={0}
                  max={1e9}
                  disabled={busy}
                  placeholder="From report"
                />
              </div>
              <div>
                <label htmlFor="lab-high">
                  Upper bound <span className="optional">optional</span>
                </label>
                <input
                  id="lab-high"
                  name="high"
                  type="number"
                  step="any"
                  min={0}
                  max={1e9}
                  disabled={busy}
                  placeholder="From report"
                />
              </div>
            </div>
            <p className="field-hint">
              Use the report’s two-sided interval in the same unit as its
              result. Leave both bounds empty if absent. One-sided limits,
              “&lt;”/“&gt;” results, and qualitative results are not
              supported—do not remove their qualifiers.
            </p>
            <label htmlFor="lab-note">
              Report context <span className="optional">optional</span>
            </label>
            <input
              id="lab-note"
              name="note"
              maxLength={500}
              placeholder="Fasting status, report notes, or questions to discuss"
              disabled={busy}
            />
            <div className="form-bottom">
              <label className="check-label">
                <input name="review" type="checkbox" required disabled={busy} />
                <span>
                  I checked the test, date, value, unit, and any bounds against
                  the original report.
                </span>
              </label>
              <button className="button primary" disabled={busy}>
                <I.Plus size={17} />
                {busy ? "Saving…" : "Save result"}
              </button>
            </div>
          </form>
        ) : (
          <div className="csv-panel">
            <div className="section-head">
              <div>
                <h3>Structured input. No silent guesses.</h3>
                <p>
                  Up to 200 rows / 100 KB. Import is all-or-nothing; review
                  every row before saving.
                </p>
              </div>
              <button
                className="button secondary small"
                onClick={() =>
                  download(
                    CSV_TEMPLATE,
                    "health-assist-template.csv",
                    "text/csv",
                  )
                }
              >
                <I.Download size={16} />
                Template
              </button>
            </div>
            <label htmlFor="csv-input">
              Paste CSV using the exact template header
            </label>
            <textarea
              id="csv-input"
              rows={6}
              value={csv}
              maxLength={100000}
              disabled={busy}
              onChange={(e) => {
                setCsv(e.target.value);
                setPreview(null);
                setReviewed(false);
              }}
              placeholder="date,test,value,unit,low,high,lab"
              spellCheck={false}
            />
            <button
              className="button secondary"
              onClick={review}
              disabled={busy || !csv.trim()}
            >
              <I.Search size={17} />
              Validate & preview
            </button>
            {preview && (
              <div className="csv-preview">
                <h3>
                  {preview.length} {preview.length === 1 ? "row" : "rows"} ready
                  for your review
                </h3>
                <div
                  className="table-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label="Scrollable results table"
                >
                  <table>
                    <thead>
                      <tr>
                        {["Date", "Test", "Value", "Unit", "Bounds", "Lab"].map(
                          (h) => (
                            <th key={h}>{h}</th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((l) => (
                        <tr key={l.id}>
                          <td>{l.date}</td>
                          <td>{catalog[l.test].label}</td>
                          <td>{l.value}</td>
                          <td>{l.unit}</td>
                          <td>
                            {l.low === null
                              ? "Not provided"
                              : `${l.low}–${l.high}`}
                          </td>
                          <td>{l.lab}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={reviewed}
                    onChange={(e) => setReviewed(e.target.checked)}
                    disabled={busy}
                  />
                  <span>
                    I verified all rows against the original report, including
                    units and bounds.
                  </span>
                </label>
                <button
                  className="button primary"
                  onClick={importRows}
                  disabled={busy || !reviewed}
                >
                  {busy ? "Saving…" : "Confirm import"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
