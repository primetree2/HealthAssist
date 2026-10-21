import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  Info,
  LoaderCircle,
  MessageSquare,
  Printer,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type {
  Analysis,
  Capabilities,
  Observation,
  RawObservation,
} from "../contracts";
import { downloadFile, exportCSV } from "../storage";

const LABELS: Record<Observation["status"], string> = {
  within_report_range: "Within report interval",
  above_report_range: "Above report interval",
  below_report_range: "Below report interval",
  needs_review: "Needs verification",
  reference_unavailable: "Interval unavailable",
  qualitative: "Qualitative finding",
  not_reported: "Not reported",
};
export function Status({ status }: { status: Observation["status"] }) {
  const Icon =
    status === "within_report_range"
      ? CheckCircle2
      : status === "above_report_range"
        ? ArrowUp
        : status === "below_report_range"
          ? ArrowDown
          : Info;
  return (
    <span className={`status status-${status}`}>
      <Icon size={14} />
      {LABELS[status]}
    </span>
  );
}
function equivalent(o: Observation) {
  if (o.canonical_value === null || !o.canonical_unit || !o.raw.unit)
    return null;
  if (o.raw.unit === o.canonical_unit && o.value === o.canonical_value)
    return null;
  return `${o.comparator}${new Intl.NumberFormat(undefined, { maximumSignificantDigits: 6 }).format(o.canonical_value)} ${o.canonical_unit}`;
}
export function Report({
  analysis,
  busy,
  onReview,
  onSave,
  onNew,
  onPrivacy,
  capabilities,
}: {
  analysis: Analysis;
  busy: boolean;
  onReview: (rows: RawObservation[], explain: boolean, cloud: boolean) => void;
  onSave: () => void;
  onNew: () => void;
  onPrivacy: () => void;
  capabilities: Capabilities | null;
}) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [edits, setEdits] = useState<Record<string, RawObservation>>({});
  const [cloudConsent, setCloudConsent] = useState(false);
  useEffect(() => {
    setEdits({});
    setFilter("all");
    setSearch("");
    setCloudConsent(false);
  }, [analysis.id]);
  const byId = useMemo(
    () => Object.fromEntries(analysis.observations.map((o) => [o.id, o])),
    [analysis],
  );
  const visible = analysis.observations.filter((o) => {
    const q =
      (o.canonical_name || o.raw.name)
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      o.raw.name.toLowerCase().includes(search.toLowerCase());
    return (
      q &&
      (filter === "all" ||
        (filter === "outside" &&
          ["above_report_range", "below_report_range"].includes(o.status)) ||
        (filter === "review" &&
          ["needs_review", "reference_unavailable"].includes(o.status)) ||
        (filter === "qualitative" &&
          ["qualitative", "not_reported"].includes(o.status)))
    );
  });
  const editedRows = () =>
    analysis.observations.map((o) => edits[o.id] || o.raw);
  const hasEdits = Object.keys(edits).length > 0;
  function edit(
    o: Observation,
    key: keyof RawObservation,
    value: string | boolean,
  ) {
    setEdits((prev) => ({
      ...prev,
      [o.id]: {
        ...(prev[o.id] || o.raw),
        [key]: value,
        ...(key !== "user_verified" ? { user_verified: false } : {}),
      },
    }));
  }
  return (
    <div className="report-view">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR HEALTH BRIEF</div>
          <h1>A clearer view of your report.</h1>
          <p>
            {analysis.extraction.filename || "Your submitted context"} ·{" "}
            {new Date(analysis.created_at).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        <button className="button secondary" onClick={onNew} disabled={busy}>
          New analysis <ArrowUpRight size={17} />
        </button>
      </div>
      <div
        className={`notice ${analysis.context.emergency_symptoms ? "danger" : "neutral"} safety-notice`}
        role={analysis.context.emergency_symptoms ? "alert" : "note"}
      >
        <ShieldCheck size={21} />
        <div>
          <strong>
            {analysis.context.emergency_symptoms
              ? "Do not wait for this report."
              : "Understanding, not a diagnosis."}
          </strong>
          <p>{analysis.safety_notices[0]}</p>
          {analysis.safety_notices.slice(1).map((x) => (
            <p key={x}>{x}</p>
          ))}
        </div>
      </div>
      <section className="report-overview panel">
        <div className="overview-title">
          <div>
            <span className="eyebrow">WHAT WAS RETAINED</span>
            <h2>
              {analysis.counts.total} observations. A transparent starting
              point.
            </h2>
            <p>{analysis.summary}</p>
          </div>
          <div className="overview-stamp">
            <FileText size={24} />
            <span>
              Report-relative
              <br />
              not population defaults
            </span>
          </div>
        </div>
        <div className="metrics">
          <div>
            <span className="metric-icon green">
              <Check size={16} />
            </span>
            <strong>{analysis.counts.within}</strong>
            <span>Within interval</span>
          </div>
          <div>
            <span className="metric-icon coral">
              <ArrowUpRight size={16} />
            </span>
            <strong>{analysis.counts.outside}</strong>
            <span>Outside interval</span>
          </div>
          <div>
            <span className="metric-icon amber">
              <AlertCircle size={16} />
            </span>
            <strong>{analysis.counts.review}</strong>
            <span>Need checking / interval</span>
          </div>
          <div>
            <span className="metric-icon violet">
              <FileText size={16} />
            </span>
            <strong>{analysis.counts.qualitative}</strong>
            <span>Qualitative / not reported</span>
          </div>
        </div>
        <div className="overview-foot">
          <Info size={15} /> Counts cover the full report. Search and filters
          never change this summary.
        </div>
      </section>
      {(analysis.extraction.warnings.length > 0 ||
        analysis.extraction.ignored_line_count > 0) && (
        <details
          className="panel extraction-notes"
          open={analysis.counts.total === 0}
        >
          <summary>
            <AlertCircle size={18} />
            <strong>
              Extraction notes (
              {analysis.extraction.warnings.length +
                (analysis.extraction.ignored_line_count > 0 ? 1 : 0)}
              )
            </strong>
            <span>Check for missing or unreadable information</span>
            <ChevronDown size={18} />
          </summary>
          <div className="detail-body">
            <ul>
              {analysis.extraction.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
            {analysis.extraction.ignored_line_count > 0 && (
              <>
                <h3 className="unparsed-title">
                  {analysis.extraction.ignored_line_count} lines were not
                  recognized as test rows
                </h3>
                <p className="field-hint">
                  These may include headings or missed results. Review the
                  original; a partial extraction is not an all-clear. Up to 30
                  examples are shown.
                </p>
                <pre className="unparsed-lines">
                  {analysis.extraction.unparsed_lines.join("\n")}
                </pre>
              </>
            )}
          </div>
        </details>
      )}
      <section className="results-section">
        <div className="section-heading">
          <div>
            <h2>Your observations</h2>
            <p>
              Compare each row with the original. Open a row to inspect its
              source or correct it.
            </p>
          </div>
          <div className="report-actions">
            <button
              className="button secondary small"
              onClick={onSave}
              disabled={busy}
            >
              <Save size={16} /> Save on this device
            </button>
            <button
              className="button secondary small"
              onClick={() => window.print()}
              disabled={busy}
            >
              <Printer size={16} /> Print / save PDF
            </button>
          </div>
        </div>
        <div className="results-toolbar">
          <div
            className="filter-group"
            role="group"
            aria-label="Filter observations"
          >
            {[
              ["all", "All", analysis.counts.total],
              ["outside", "Outside interval", analysis.counts.outside],
              ["review", "Need checking", analysis.counts.review],
              ["qualitative", "Qualitative", analysis.counts.qualitative],
            ].map(([value, label, count]) => (
              <button
                key={value}
                className={filter === value ? "active" : ""}
                aria-pressed={filter === value}
                onClick={() => setFilter(String(value))}
              >
                {label}
                <span>{count}</span>
              </button>
            ))}
          </div>
          <label className="search-box">
            <Search size={17} />
            <span className="visually-hidden">Find a test</span>
            <input
              placeholder="Find a test…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        {hasEdits && (
          <div className="edits-bar" role="status">
            <span>
              You have unsaved row edits. Rechecking sends these rows to this
              app’s server.
            </span>
            <div>
              <button
                className="text-button"
                onClick={() => setEdits({})}
                disabled={busy}
              >
                Discard edits
              </button>
              <button
                className="button primary small"
                onClick={() => onReview(editedRows(), false, false)}
                disabled={busy}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Check size={16} />
                )}{" "}
                Recheck edited rows
              </button>
            </div>
          </div>
        )}
        <div className="observation-list">
          {visible.map((o) => {
            const r = edits[o.id] || o.raw;
            return (
              <article key={o.id} id={o.id} className="observation panel">
                <div className="observation-main">
                  <div className="observation-name">
                    <span className="category">{o.category}</span>
                    <h3>{o.canonical_name || o.raw.name}</h3>
                    {o.canonical_name && o.canonical_name !== o.raw.name && (
                      <span className="reported-name">
                        Reported: {o.raw.name}
                      </span>
                    )}
                  </div>
                  <div className="observation-value">
                    <span className="mini-label">Reported value</span>
                    <strong>
                      {o.raw.result || "Not provided"}{" "}
                      <small>{o.raw.unit}</small>
                    </strong>
                    {equivalent(o) && (
                      <span className="equivalent">
                        Equivalent: {equivalent(o)}
                      </span>
                    )}
                  </div>
                  <div className="observation-range">
                    <span className="mini-label">Lab interval / expected</span>
                    <span>{o.raw.reference_text || "Not provided"}</span>
                    {o.raw.flag && <small>Printed flag: {o.raw.flag}</small>}
                  </div>
                  <div className="observation-status">
                    <Status status={o.status} />
                    {o.raw.user_verified && (
                      <span className="verified">
                        <Check size={13} /> Checked by you
                      </span>
                    )}
                  </div>
                </div>
                <details className="observation-details">
                  <summary>
                    <span>
                      {o.issues.length ? (
                        <>
                          <AlertCircle size={15} /> {o.issues.length} item
                          {o.issues.length === 1 ? "" : "s"} to check
                        </>
                      ) : (
                        <>
                          <FileText size={15} /> Source & details
                        </>
                      )}
                    </span>
                    <span>
                      Inspect or correct <ChevronDown size={15} />
                    </span>
                  </summary>
                  <div className="detail-body">
                    <p className="explanation">{o.explanation}</p>
                    {o.issues.length > 0 && (
                      <ul className="issue-list">
                        {o.issues.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    )}
                    <div className="source-block">
                      <div>
                        <strong>Source evidence</strong>
                        <span>
                          {o.raw.page ? `Page ${o.raw.page} · ` : ""}
                          {o.raw.source_kind.replaceAll("_", " ")}
                          {o.raw.source_section
                            ? ` · ${o.raw.source_section}`
                            : ""}
                          {o.raw.source_row ? ` · row ${o.raw.source_row}` : ""}
                        </span>
                      </div>
                      <pre>
                        {o.raw.source_text ||
                          "No supporting source text was available. Verify the original document."}
                      </pre>
                    </div>
                    <fieldset disabled={busy} className="correction-fields">
                      <legend>Correct this observation</legend>
                      <p className="field-hint">
                        Use the values printed on the original. Don’t substitute
                        a range found online. Check the verification box after
                        making corrections.
                      </p>
                      <div className="correction-grid">
                        {(
                          [
                            ["name", "Test name", 160],
                            ["result", "Result (keep < or >)", 160],
                            ["unit", "Reported unit", 80],
                            ["reference_text", "Lab interval / expected", 240],
                            ["flag", "Printed flag", 30],
                            ["report_date", "Report date", 40],
                          ] as const
                        ).map(([key, label, max]) => (
                          <div className="field" key={key}>
                            <label htmlFor={`${o.id}-${key}`}>{label}</label>
                            <input
                              id={`${o.id}-${key}`}
                              value={r[key]}
                              onChange={(e) => edit(o, key, e.target.value)}
                              maxLength={max}
                            />
                          </div>
                        ))}
                      </div>
                      <label className="check-row">
                        <input
                          type="checkbox"
                          checked={r.user_verified}
                          onChange={(e) =>
                            edit(o, "user_verified", e.target.checked)
                          }
                        />
                        <span>
                          I checked this row against the original, including the
                          person, result, unit, and applicable reference
                          interval.
                        </span>
                      </label>
                    </fieldset>
                  </div>
                </details>
              </article>
            );
          })}
        </div>
        {visible.length === 0 && (
          <div className="empty-state panel">
            <Search size={27} />
            <h3>
              {analysis.counts.total
                ? "No observations match this view."
                : "No structured rows were extracted."}
            </h3>
            <p>
              {analysis.counts.total
                ? "Try another filter or search. The full-report summary above is unchanged."
                : "This does not mean the report is normal. Try a digital export, pasted text, or consented cloud OCR."}
            </p>
            {analysis.counts.total > 0 && (
              <button
                className="button secondary"
                onClick={() => {
                  setFilter("all");
                  setSearch("");
                }}
              >
                Show all observations
              </button>
            )}
          </div>
        )}
      </section>
      <div className="insights-layout">
        <section className="panel visit-panel">
          <div className="section-icon">
            <MessageSquare size={22} />
          </div>
          <h2>A better conversation starts here.</h2>
          <p>
            Bring these questions to your clinician, along with the original
            report.
          </p>
          <ol>
            {(analysis.ai?.doctor_questions || analysis.doctor_questions).map(
              (q, i) => (
                <li key={i}>{q}</li>
              ),
            )}
          </ol>
          {analysis.symptoms && (
            <div className="symptom-note">
              <strong>Your symptom context</strong>
              <p>{analysis.symptoms}</p>
            </div>
          )}
        </section>
        <section className="panel ai-panel">
          <div className="section-icon purple">
            <Sparkles size={22} />
          </div>
          <h2>Context, with clear limits.</h2>
          {analysis.ai ? (
            <>
              <span className="tag violet-tag">
                AI-generated · verify with a clinician
              </span>
              <p>{analysis.ai.overview}</p>
              {analysis.ai.context_notes.map((n, i) => (
                <div className="evidence-note" key={i}>
                  <p>{n.text}</p>
                  <div>
                    {n.observation_ids.map((id) => (
                      <a key={id} href={`#${id}`} className="evidence-link">
                        {byId[id]?.canonical_name || byId[id]?.raw.name || id}{" "}
                        <ArrowUpRight size={12} />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
              <ul className="field-hint">
                {analysis.ai.limitations.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p>
                An optional AI brief can discuss supported observations with
                your context and suggest questions. It cannot diagnose or
                determine urgency.
              </p>
              <label
                className={`check-row ${!capabilities?.cloud_available ? "disabled" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={cloudConsent}
                  onChange={(e) => setCloudConsent(e.target.checked)}
                  disabled={!capabilities?.cloud_available || busy}
                />
                <span>
                  I allow structured results, symptoms, and personal context to
                  be sent to Google Gemini for this explanation.
                </span>
              </label>
              <button
                className="button secondary"
                disabled={
                  !cloudConsent ||
                  busy ||
                  hasEdits ||
                  !capabilities?.cloud_available
                }
                onClick={() => onReview(editedRows(), true, cloudConsent)}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <Sparkles size={17} />
                )}{" "}
                Generate optional explanation
              </button>
              {hasEdits && (
                <p className="field-hint">
                  Recheck or discard your row edits first.
                </p>
              )}
              {!capabilities?.cloud_available && (
                <p className="field-hint">
                  AI is not configured on this deployment. Your report-relative
                  analysis and visit questions do not require it.
                </p>
              )}
              {analysis.ai_notice && (
                <div className="notice warning" role="status">
                  <Info size={17} />
                  <p>{analysis.ai_notice}</p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
      <section className="panel limitations-panel">
        <h3>What this brief cannot tell you</h3>
        <ul>
          {analysis.limitations.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </section>
      <div className="export-bar">
        <span>
          <ShieldCheck size={16} /> Not saved automatically. Exports may contain
          sensitive health details.
        </span>
        <div>
          <button className="text-button" onClick={() => exportCSV(analysis)}>
            <Download size={16} /> Export CSV
          </button>
          <button
            className="text-button"
            onClick={() =>
              downloadFile(
                "healthassist-brief.json",
                JSON.stringify(analysis, null, 2),
                "application/json",
              )
            }
          >
            <Download size={16} /> Export JSON
          </button>
          <button className="text-button" onClick={onPrivacy}>
            Privacy details
          </button>
        </div>
      </div>
    </div>
  );
}

export function PrintBrief({ analysis }: { analysis: Analysis }) {
  return (
    <section className="print-brief">
      <header>
        <h1>HealthAssist · Clinician conversation brief</h1>
        <p>
          Generated {new Date(analysis.created_at).toLocaleString()} ·{" "}
          {analysis.extraction.filename || "User-submitted context"}
        </p>
        <strong>
          Educational organization only. Not a diagnosis, treatment plan, or
          emergency assessment.
        </strong>
      </header>
      <h2>Safety notices</h2>
      {analysis.safety_notices.map((n, i) => (
        <p key={i}>{n}</p>
      ))}
      <h2>Report summary</h2>
      <p>{analysis.summary}</p>
      {analysis.extraction.warnings.map((n, i) => (
        <p key={i}>Extraction note: {n}</p>
      ))}
      {analysis.symptoms && (
        <>
          <h2>Symptoms described by the user</h2>
          <p>{analysis.symptoms}</p>
        </>
      )}
      <h2>Context supplied</h2>
      <p>
        Age: {analysis.context.age ?? "Not provided"} · Reference sex:{" "}
        {analysis.context.reference_sex} · Fasting: {analysis.context.fasting} ·
        Pregnancy: {analysis.context.pregnancy}
      </p>
      {analysis.context.medications && (
        <p>Medications / supplements: {analysis.context.medications}</p>
      )}
      <h2>All observations (unfiltered)</h2>
      <table>
        <thead>
          <tr>
            <th>Test / source</th>
            <th>Original value & unit</th>
            <th>Report interval</th>
            <th>Classification</th>
          </tr>
        </thead>
        <tbody>
          {analysis.observations.map((o) => (
            <tr key={o.id}>
              <td>
                {o.raw.name}
                <br />
                <small>
                  {o.raw.page ? `Page ${o.raw.page}, ` : ""}
                  {o.raw.source_kind}
                  {o.raw.user_verified ? " · user-checked" : ""}
                </small>
              </td>
              <td>
                {o.raw.result} {o.raw.unit}
                {equivalent(o) && (
                  <>
                    <br />
                    <small>Equivalent: {equivalent(o)}</small>
                  </>
                )}
              </td>
              <td>{o.raw.reference_text || "Not provided"}</td>
              <td>
                {LABELS[o.status]}
                {o.issues.length > 0 && (
                  <ul>
                    {o.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Questions for the clinician</h2>
      <ol>
        {(analysis.ai?.doctor_questions || analysis.doctor_questions).map(
          (q, i) => (
            <li key={i}>{q}</li>
          ),
        )}
      </ol>
      {analysis.ai && (
        <>
          <h2>Optional AI-generated context (requires review)</h2>
          <p>{analysis.ai.overview}</p>
          {analysis.ai.context_notes.map((n, i) => (
            <p key={i}>
              {n.text} [Evidence: {n.observation_ids.join(", ")}]
            </p>
          ))}
        </>
      )}
      <h2>Limitations</h2>
      <ul>
        {analysis.limitations.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </section>
  );
}
