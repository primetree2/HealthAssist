import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  ArrowRight,
  UploadCloud,
  FileText,
  Check,
  X,
  ShieldCheck,
  ScanLine,
  Sparkles,
  ChevronDown,
  AlertTriangle,
  LoaderCircle,
  FlaskConical,
} from "lucide-react";
import type { Capabilities, Draft } from "../contracts";
import { Aurora } from "./Aurora";
export const ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.tsv,.json,.xlsx,.docx";
export function Intake({
  draft,
  setDraft,
  file,
  setFile,
  busy,
  capabilities,
  onSubmit,
  onSample,
  onPrivacy,
  onCancel,
}: {
  draft: Draft;
  setDraft: (v: Draft) => void;
  file: File | null;
  setFile: (f: File | null) => void;
  busy: boolean;
  capabilities: Capabilities | null;
  onSubmit: () => void;
  onSample: () => void;
  onPrivacy: () => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"file" | "text">("file");
  const [drag, setDrag] = useState(false);
  const [fileError, setFileError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft({ ...draft, [key]: value });
  }
  function selectFile(f: File | undefined) {
    if (!f) return;
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (f.size > 4_000_000) {
      setFileError("Choose a file smaller than 4 MB.");
      return;
    }
    if (!ACCEPT.split(",").includes(ext)) {
      setFileError(
        "This file type is not supported. Try PDF, an image, or a structured export.",
      );
      return;
    }
    setFileError("");
    setFile(f);
    update("pastedText", "");
  }
  function drop(e: DragEvent) {
    e.preventDefault();
    setDrag(false);
    if (!busy) selectFile(e.dataTransfer.files[0]);
  }
  return (
    <>
      <section className="hero">
        <Aurora hero />
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="little-star">✳</span> CLARITY, WITH CARE
          </div>
          <h1>
            A little clarity.
            <br />
            <span>A better next step.</span>
          </h1>
          <p>
            Bring your lab report and how you’re feeling together. Understand
            the details, check the evidence, and prepare for a better
            conversation.
          </p>
          <button className="text-button" onClick={onSample} disabled={busy}>
            <FlaskConical size={17} /> Explore a sample report{" "}
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="hero-note">
          <div className="note-icon">
            <ScanLine size={23} />
          </div>
          <strong>
            Facts first.
            <br /> Not guesswork.
          </strong>
          <p>
            Original values. Clear sources.
            <br /> Uncertainty made visible.
          </p>
          <div className="note-points">
            <Check size={15} /> No generic reference ranges
          </div>
        </div>
      </section>
      <div className="work-heading">
        <div>
          <h2>Let’s start with your report</h2>
          <p>
            A report, symptoms, or both. Only share what you’re comfortable
            with.
          </p>
        </div>
        <span className="tag muted">No account required</span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="intake-layout"
      >
        <div className="intake-main">
          <section className="panel form-panel">
            <div className="section-title">
              <span className="step-number">01</span>
              <div>
                <h3>Add your report</h3>
                <p>
                  Optional if you only want to prepare questions about symptoms.
                </p>
              </div>
            </div>
            <div
              className="segmented"
              role="group"
              aria-label="Report input method"
            >
              <button
                type="button"
                aria-pressed={mode === "file"}
                onClick={() => {
                  setMode("file");
                  update("pastedText", "");
                }}
                disabled={busy}
              >
                <UploadCloud size={16} /> Upload a file
              </button>
              <button
                type="button"
                aria-pressed={mode === "text"}
                onClick={() => {
                  setMode("text");
                  setFile(null);
                }}
                disabled={busy}
              >
                <FileText size={16} /> Paste results
              </button>
            </div>
            {mode === "file" ? (
              <>
                <input
                  ref={input}
                  id="report-file"
                  tabIndex={-1}
                  aria-label="Report file"
                  className="visually-hidden"
                  type="file"
                  accept={ACCEPT}
                  disabled={busy}
                  aria-describedby="upload-help"
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    selectFile(e.target.files?.[0])
                  }
                />
                <div
                  className={`dropzone ${drag ? "dragging" : ""} ${file ? "has-file" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDrag(true);
                  }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={drop}
                >
                  <div className="upload-icon">
                    {file ? <FileText size={26} /> : <UploadCloud size={26} />}
                  </div>
                  {file ? (
                    <>
                      <strong className="file-name">{file.name}</strong>
                      <p>
                        {(file.size / 1000).toFixed(0)} KB · Ready to extract
                      </p>
                      <div className="button-row">
                        <button
                          className="button secondary small"
                          type="button"
                          onClick={() => input.current?.click()}
                          disabled={busy}
                        >
                          Choose another
                        </button>
                        <button
                          className="icon-button"
                          type="button"
                          aria-label="Remove selected file"
                          onClick={() => {
                            setFile(null);
                            if (input.current) input.current.value = "";
                          }}
                          disabled={busy}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <strong>Drop your report here</strong>
                      <p>or choose a file from your device</p>
                      <button
                        className="button secondary"
                        type="button"
                        onClick={() => input.current?.click()}
                        disabled={busy}
                      >
                        Choose file <ArrowRight size={16} />
                      </button>
                    </>
                  )}
                </div>
                <p className="field-hint" id="upload-help">
                  PDF, JPG, PNG, WebP, TXT, CSV, TSV, JSON, XLSX, DOCX · Up to 4
                  MB · PDF up to 15 pages
                </p>
                {fileError && (
                  <p className="field-error" role="alert">
                    {fileError}
                  </p>
                )}
              </>
            ) : (
              <div className="field">
                <label htmlFor="pasted-report">Report text</label>
                <textarea
                  id="pasted-report"
                  value={draft.pastedText}
                  onChange={(e) => update("pastedText", e.target.value)}
                  rows={7}
                  maxLength={20000}
                  disabled={busy}
                  placeholder={
                    "Hemoglobin: 12.8 g/dL 12.0–15.5\nPlatelet Count: 245 10^9/L 150–450"
                  }
                />
                <p className="field-hint">
                  Keep test names, units, and reference intervals together.
                  Tables and plain text are supported; inspect the extracted
                  rows.
                </p>
              </div>
            )}
          </section>
          <section className="panel form-panel">
            <div className="section-title">
              <span className="step-number">02</span>
              <div>
                <h3>Add a little context</h3>
                <p>
                  Your symptoms and context stay separate from measured facts.
                </p>
              </div>
            </div>
            <div className="field">
              <label htmlFor="symptoms">
                How have you been feeling?{" "}
                <span className="optional">Optional</span>
              </label>
              <textarea
                id="symptoms"
                value={draft.symptoms}
                onChange={(e) => update("symptoms", e.target.value)}
                maxLength={4000}
                rows={3}
                placeholder="For example: I’ve felt unusually tired for two weeks…"
                disabled={busy}
              />
              <div className="field-counter">
                {draft.symptoms.length.toLocaleString()} / 4,000
              </div>
            </div>
            <details className="context-details">
              <summary>
                Personal context <span className="optional">Optional</span>
                <ChevronDown size={17} />
              </summary>
              <div className="context-fields">
                <div className="field">
                  <label htmlFor="age">Age in years</label>
                  <input
                    id="age"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="120"
                    step="1"
                    value={draft.age}
                    onChange={(e) => update("age", e.target.value)}
                    placeholder="Not provided"
                    disabled={busy}
                  />
                </div>
                <div className="field">
                  <label htmlFor="reference-sex">
                    Sex used for lab intervals
                  </label>
                  <select
                    id="reference-sex"
                    value={draft.referenceSex}
                    onChange={(e) =>
                      update(
                        "referenceSex",
                        e.target.value as Draft["referenceSex"],
                      )
                    }
                    disabled={busy}
                  >
                    <option value="unspecified">Not provided</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="fasting">Fasting for this test?</label>
                  <select
                    id="fasting"
                    value={draft.fasting}
                    onChange={(e) =>
                      update("fasting", e.target.value as Draft["fasting"])
                    }
                    disabled={busy}
                  >
                    <option value="unspecified">Not sure / not provided</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="pregnancy">Pregnancy relevant?</label>
                  <select
                    id="pregnancy"
                    value={draft.pregnancy}
                    onChange={(e) =>
                      update("pregnancy", e.target.value as Draft["pregnancy"])
                    }
                    disabled={busy}
                  >
                    <option value="unspecified">
                      Not provided / not applicable
                    </option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div className="field full-width">
                  <label htmlFor="medications">
                    Relevant medications or supplements
                  </label>
                  <input
                    id="medications"
                    value={draft.medications}
                    onChange={(e) => update("medications", e.target.value)}
                    maxLength={1000}
                    placeholder="Optional; do not change treatment based on this app"
                    disabled={busy}
                  />
                </div>
              </div>
            </details>
            <label className="check-row emergency-check">
              <input
                type="checkbox"
                checked={draft.emergency}
                onChange={(e) => update("emergency", e.target.checked)}
                disabled={busy}
              />
              <span>
                I am currently experiencing severe chest pain, difficulty
                breathing, fainting, or sudden weakness or speech changes.
              </span>
            </label>
            {draft.emergency && (
              <div className="notice danger" role="alert">
                <AlertTriangle size={20} />
                <div>
                  <strong>Please seek emergency medical help now.</strong>
                  <p>
                    Do not wait for an analysis. This app cannot assess
                    emergencies.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
        <aside className="intake-aside">
          <section className="panel consent-panel">
            <div className="aside-icon">
              <ShieldCheck size={23} />
            </div>
            <h3>You’re in control.</h3>
            <p>
              Reports are not saved automatically. Cloud transcription and AI
              explanations are optional.
            </p>
            <label className="check-row">
              <input
                type="checkbox"
                checked={draft.consent}
                onChange={(e) => update("consent", e.target.checked)}
                disabled={busy}
                required
              />
              <span>
                I agree to send these details to this app’s server for
                processing.
              </span>
            </label>
            <label
              className={`check-row ${!capabilities?.cloud_available ? "disabled" : ""}`}
            >
              <input
                type="checkbox"
                checked={draft.cloudConsent}
                onChange={(e) => update("cloudConsent", e.target.checked)}
                disabled={busy || !capabilities?.cloud_available}
              />
              <span>
                Allow sending my report to Google Gemini if cloud OCR is needed.
                <span className="check-hint">
                  Scans and photos need OCR. Cloud-extracted rows must be
                  checked before interpretation.
                </span>
              </span>
            </label>
            {!capabilities?.cloud_available && (
              <p className="field-hint">
                Cloud OCR isn’t enabled on this deployment. Digital PDFs and
                structured files work without it.
              </p>
            )}
            <button
              type="button"
              className="text-button privacy-link"
              onClick={onPrivacy}
            >
              How your data is handled <ArrowRight size={14} />
            </button>
            <button
              className="button primary analyze-button"
              type="submit"
              disabled={busy || !draft.consent}
            >
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={19} /> Processing your
                  report…
                </>
              ) : (
                <>
                  Understand my report <ArrowRight size={18} />
                </>
              )}
            </button>
            {busy && (
              <>
                <p className="processing-note" role="status">
                  Extracting and checking. Scans may take longer. There is no
                  estimated progress percentage.
                </p>
                <button
                  type="button"
                  className="text-button"
                  onClick={onCancel}
                >
                  Cancel request
                </button>
              </>
            )}
            <p className="disclaimer-small">
              For understanding and visit preparation.
              <br />
              Not a diagnosis or emergency service.
            </p>
          </section>
          <div className="how-it-works">
            <h4>What happens next</h4>
            <div>
              <ScanLine size={18} />
              <p>
                <strong>Extract the details</strong>
                <span>Original values, units, and intervals.</span>
              </p>
            </div>
            <div>
              <Check size={18} />
              <p>
                <strong>Check what’s uncertain</strong>
                <span>Nothing important is silently discarded.</span>
              </p>
            </div>
            <div>
              <Sparkles size={18} />
              <p>
                <strong>Prepare your next step</strong>
                <span>Useful questions for your clinician.</span>
              </p>
            </div>
          </div>
        </aside>
      </form>
    </>
  );
}
