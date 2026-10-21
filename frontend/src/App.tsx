import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  FileText,
  HardDrive,
  HeartPulse,
  Menu,
  Monitor,
  Moon,
  Plus,
  ShieldCheck,
  Sun,
  X,
  AlertCircle,
} from "lucide-react";
import { analyze, ApiError, review } from "./api";
import type {
  Analysis,
  Capabilities,
  Draft,
  RawObservation,
} from "./contracts";
import { contextSchema, rawSchema } from "./contracts";
import { deleteSaved, loadSaved, saveAnalysis } from "./storage";
import { Intake } from "./components/Intake";
import { Report, PrintBrief } from "./components/Report";
import { History } from "./components/History";
import { PrivacyDialog } from "./components/PrivacyDialog";

const EMPTY: Draft = {
  age: "",
  referenceSex: "unspecified",
  pregnancy: "unspecified",
  fasting: "unspecified",
  medications: "",
  symptoms: "",
  pastedText: "",
  emergency: false,
  consent: false,
  cloudConsent: false,
};
type View = "new" | "report" | "saved";
type Theme = "system" | "light" | "dark";
function initialTheme(): Theme {
  try {
    const t = localStorage.getItem("healthassist.theme");
    if (t === "light" || t === "dark") return t;
  } catch {
    /* preference storage is optional */
  }
  return "system";
}
export default function App() {
  const [isMobile, setIsMobile] = useState(
    () => matchMedia("(max-width: 900px)").matches,
  );
  const navigationRef = useRef<HTMLElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const [view, setView] = useState<View>("new");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [saved, setSaved] = useState(loadSaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [offline, setOffline] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const query = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (query.matches ? "dark" : "light") : theme;
    };
    apply();
    query.addEventListener("change", apply);
    try {
      localStorage.setItem("healthassist.theme", theme);
    } catch {
      /* optional */
    }
    return () => query.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 6000);
    fetch("/api/health", { signal: c.signal, cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        if (d.status !== "ok" || typeof d.cloud_available !== "boolean")
          throw new Error();
        setCapabilities(d);
        setOffline(false);
      })
      .catch(() => {
        if (!c.signal.aborted || !document.hidden) setOffline(true);
      })
      .finally(() => clearTimeout(t));
    return () => {
      c.abort();
      clearTimeout(t);
    };
  }, []);
  useEffect(() => {
    const m = matchMedia("(max-width: 900px)");
    const update = () => {
      setIsMobile(m.matches);
      if (!m.matches) setMenu(false);
    };
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!menu) return;
    document.body.classList.add("navigation-open");
    const nodes = () =>
      Array.from(
        navigationRef.current?.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled),a[href]",
        ) || [],
      );
    nodes()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        return;
      }
      if (e.key === "Tab") {
        const all = nodes();
        const first = all[0],
          last = all.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.classList.remove("navigation-open");
      document.removeEventListener("keydown", key);
      menuTrigger.current?.focus();
    };
  }, [menu]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 8000);
    return () => clearTimeout(t);
  }, [toast]);
  function navigate(next: View) {
    setView(next);
    setMenu(false);
    setError("");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function run(action: (signal: AbortSignal) => Promise<Analysis>) {
    if (busy) return;
    const c = new AbortController();
    controller.current = c;
    setBusy(true);
    setError("");
    setRequestId(null);
    const timeout = setTimeout(() => c.abort("timeout"), 65000);
    try {
      const result = await action(c.signal);
      if (c.signal.aborted) return;
      setAnalysis(result);
      navigate("report");
      setSaved(loadSaved());
    } catch (e) {
      if (c.signal.aborted)
        setError(
          c.signal.reason === "timeout"
            ? "Processing took too long. Your inputs are kept. Try a smaller report or another format."
            : "Request canceled. Your inputs are kept. Server-side processing may still finish.",
        );
      else if (e instanceof ApiError) {
        setError(e.message);
        setRequestId(e.requestId);
      } else if (e instanceof TypeError)
        setError(
          "Could not reach the server. Check your connection and try again. Your inputs are still here.",
        );
      else
        setError(
          e instanceof Error
            ? e.message
            : "The analysis could not be completed. Your inputs are still here.",
        );
    } finally {
      clearTimeout(timeout);
      if (controller.current === c) {
        controller.current = null;
        setBusy(false);
      }
    }
  }
  function submit() {
    if (!draft.consent) {
      setError("Please agree to server processing before continuing.");
      return;
    }
    const age = draft.age === "" ? null : Number(draft.age);
    const context = contextSchema.safeParse({
      age,
      reference_sex: draft.referenceSex,
      pregnancy: draft.pregnancy,
      fasting: draft.fasting,
      medications: draft.medications,
      emergency_symptoms: draft.emergency,
    });
    if (!context.success) {
      setError(
        "Please check personal context. Age must be a whole number from 0 to 120.",
      );
      return;
    }
    if (!file && !draft.pastedText.trim() && !draft.symptoms.trim()) {
      setError("Add a report, pasted results, or symptoms to get started.");
      return;
    }
    const form = new FormData();
    if (file) form.append("file", file);
    form.append("pasted_text", draft.pastedText);
    form.append("symptoms", draft.symptoms);
    form.append("context", JSON.stringify(context.data));
    form.append("consent_processing", "true");
    form.append("allow_cloud", String(draft.cloudConsent));
    form.append("explain", "false");
    void run((signal) => analyze(form, signal));
  }
  function sample() {
    void run(async (signal) => {
      const r = await fetch("/samples/example-report.csv", { signal });
      if (!r.ok) throw new Error("The sample file could not be loaded.");
      const data = await r.blob();
      const form = new FormData();
      form.append(
        "file",
        new File([data], "Sample · demonstration report.csv", {
          type: "text/csv",
        }),
      );
      form.append("context", "{}");
      form.append("consent_processing", "true");
      const result = await analyze(form, signal);
      setToast("This is synthetic sample data, not a real patient report.");
      return result;
    });
  }
  function applyReview(
    rows: RawObservation[],
    explain: boolean,
    cloud: boolean,
  ) {
    if (!analysis) return;
    for (const row of rows) {
      if (!rawSchema.safeParse(row).success) {
        setError(
          "A row has missing or invalid fields. Check its name, result, and input lengths before rechecking.",
        );
        return;
      }
    }
    void run((signal) => review(analysis, rows, explain, cloud, signal));
  }
  function save() {
    if (!analysis) return;
    try {
      setSaved(saveAnalysis(analysis));
      setToast(
        "Saved in this browser. Health details are not encrypted by this app; avoid shared devices.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "This browser could not save the report. You can still export it.",
      );
    }
  }
  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="app-shell">
        <aside
          ref={navigationRef}
          id="workspace-nav"
          inert={isMobile && !menu}
          aria-hidden={isMobile && !menu ? true : undefined}
          className={`sidebar ${menu ? "is-open" : ""}`}
          aria-label="Main navigation"
        >
          <a
            className="brand"
            href="#main"
            onClick={(e) => {
              e.preventDefault();
              if (!busy) navigate("new");
            }}
          >
            <span className="brand-mark">
              <HeartPulse size={23} strokeWidth={1.8} />
            </span>
            <span>
              HealthAssist
              <span className="brand-sub">A little more clarity.</span>
            </span>
          </a>
          <div className="sidebar-section-label">YOUR WORKSPACE</div>
          <nav>
            <button
              className={`nav-item ${view === "new" ? "selected" : ""}`}
              aria-current={view === "new" ? "page" : undefined}
              disabled={busy}
              onClick={() => navigate("new")}
            >
              <Plus size={19} /> New analysis <ArrowRight size={15} />
            </button>
            <button
              className={`nav-item ${view === "report" ? "selected" : ""}`}
              aria-current={view === "report" ? "page" : undefined}
              disabled={!analysis || busy}
              onClick={() => navigate("report")}
            >
              <FileText size={19} /> Current brief
            </button>
            <button
              className={`nav-item ${view === "saved" ? "selected" : ""}`}
              aria-current={view === "saved" ? "page" : undefined}
              disabled={busy}
              onClick={() => {
                setSaved(loadSaved());
                navigate("saved");
              }}
            >
              <HardDrive size={19} /> Saved on device{" "}
              <span className="nav-count">{saved.length}</span>
            </button>
          </nav>
          <div className="sidebar-care">
            <div className="small-orbit">
              <Activity size={20} />
            </div>
            <h3>
              More understanding.
              <br />
              Less uncertainty.
            </h3>
            <p>
              A thoughtful starting point for your next clinician conversation.
            </p>
            <span>
              <CheckCircle2 size={14} /> Evidence before explanation
            </span>
          </div>
          <div className="sidebar-bottom">
            <button className="nav-item" onClick={() => setPrivacy(true)}>
              <ShieldCheck size={18} /> Privacy & limitations
            </button>
            <button
              className="nav-item"
              onClick={() =>
                setTheme(
                  theme === "system"
                    ? "light"
                    : theme === "light"
                      ? "dark"
                      : "system",
                )
              }
              aria-label={`Theme: ${theme}. Change theme.`}
            >
              <ThemeIcon size={18} /> {theme[0].toUpperCase() + theme.slice(1)}{" "}
              theme
            </button>
            <p>
              HealthAssist 2.0
              <br />
              Educational use · Not medical advice
            </p>
          </div>
        </aside>
        {menu && (
          <button
            className="menu-scrim"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          />
        )}
        <div className="main-shell">
          <header className="topbar">
            <div className="mobile-brand">
              <HeartPulse size={23} />
              <span>HealthAssist</span>
            </div>
            <div className="breadcrumb">
              Your workspace <span>/</span>{" "}
              <strong>
                {view === "new"
                  ? "New analysis"
                  : view === "report"
                    ? "Current brief"
                    : "Saved on device"}
              </strong>
            </div>
            <div className="topbar-right">
              <span className="privacy-state">
                <span /> No automatic report saving
              </span>
              <button
                ref={menuTrigger}
                aria-controls="workspace-nav"
                className="icon-button mobile-menu"
                aria-label={menu ? "Close navigation" : "Open navigation"}
                aria-expanded={menu}
                onClick={() => setMenu(!menu)}
              >
                {menu ? <X size={23} /> : <Menu size={23} />}
              </button>
            </div>
          </header>
          <main id="main" tabIndex={-1} aria-busy={busy}>
            <div className="page-content">
              {offline && (
                <div className="notice warning connection-notice" role="status">
                  <InfoIcon />
                  <p>
                    The API could not be reached. If running locally, start the
                    Python server as well as Vite. Your inputs remain available.
                  </p>
                </div>
              )}
              {error && (
                <div
                  className="notice danger error-notice"
                  ref={errorRef}
                  tabIndex={-1}
                  role="alert"
                >
                  <AlertCircle size={21} />
                  <div>
                    <strong>We couldn’t finish that step.</strong>
                    <p>{error}</p>
                    {requestId && <small>Support reference: {requestId}</small>}
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Dismiss error"
                    onClick={() => setError("")}
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
              {view === "new" && (
                <Intake
                  draft={draft}
                  setDraft={setDraft}
                  file={file}
                  setFile={setFile}
                  busy={busy}
                  capabilities={capabilities}
                  onSubmit={submit}
                  onSample={sample}
                  onPrivacy={() => setPrivacy(true)}
                  onCancel={() => controller.current?.abort("user")}
                />
              )}
              {view === "report" && analysis && (
                <Report
                  analysis={analysis}
                  busy={busy}
                  onReview={applyReview}
                  onSave={save}
                  onNew={() => navigate("new")}
                  onPrivacy={() => setPrivacy(true)}
                  capabilities={capabilities}
                />
              )}{" "}
              {view === "saved" && (
                <History
                  saved={saved}
                  onOpen={(a) => {
                    setAnalysis(a);
                    navigate("report");
                  }}
                  onDelete={(id) => {
                    try {
                      setSaved(deleteSaved(id));
                      setToast("Saved brief deleted from this browser.");
                    } catch {
                      setError(
                        "This browser could not remove the saved brief. Check its storage permissions.",
                      );
                    }
                  }}
                  onClear={() => {
                    try {
                      setSaved(deleteSaved());
                      setToast("All saved briefs deleted from this browser.");
                    } catch {
                      setError(
                        "This browser could not clear its saved reports.",
                      );
                    }
                  }}
                />
              )}
              <footer className="app-footer">
                <span>
                  <HeartPulse size={15} /> Built for clarity. Designed with
                  care.
                </span>
                <span>
                  Always bring your original report to your clinician.
                </span>
              </footer>
            </div>
          </main>
        </div>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          <p>{toast}</p>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
      <PrivacyDialog open={privacy} onClose={() => setPrivacy(false)} />
      {analysis && <PrintBrief analysis={analysis} />}
    </>
  );
}
function InfoIcon() {
  return <AlertCircle size={20} />;
}
