"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import * as I from "./icons";
import { catalog, emergencyExamples, sources } from "@/lib/catalog";
import {
  emptyJournal,
  errorMessage,
  journalSchema,
  today,
  type Journal,
} from "@/lib/schema";
import {
  classify,
  comparison,
  latestLabs,
  questions,
  recurring,
  visitSummary,
} from "@/lib/engine";
import { demoJournal } from "@/lib/demo";
import {
  acquireVaultLock,
  decryptJournal,
  deleteVault,
  deriveKey,
  encryptJournal,
  persistEnvelope,
  readEnvelope,
  type Envelope,
  type VaultKey,
} from "@/lib/vault";
import type { Mode, View } from "./types";
import {
  displayDate,
  shortDate,
  fmt,
  download,
  Status,
  SectionTitle,
  Empty,
  SafetyNotice,
} from "./ui";
import CheckinForm from "./checkin-form";
import LabForm from "./lab-form";
import DataSettings from "./data-settings";
import Sources from "./sources";
import Aurora from "./aurora";
const nav = [
  { id: "overview", label: "Overview", icon: I.LayoutDashboard },
  { id: "checkin", label: "Check-in", icon: I.Activity },
  { id: "labs", label: "Lab notebook", icon: I.FlaskConical },
  { id: "history", label: "Your timeline", icon: I.History },
  { id: "visit", label: "Visit notes", icon: I.ClipboardList },
] as const;
export default function Workspace() {
  const [mode, setMode] = useState<Mode>("locked");
  const [view, setView] = useState<View>("overview");
  const [journal, setJournal] = useState<Journal>(emptyJournal);
  const [vault, setVault] = useState<VaultKey | null>(null);
  const [stored, setStored] = useState<Envelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobile, setMobile] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [help, setHelp] = useState(false);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const lockRelease = useRef<(() => void) | null>(null);
  const currentVault = useRef<VaultKey | null>(null);
  const busyRef = useRef(false);
  const lockAfterSave = useRef(false);
  const currentMode = useRef<Mode>("locked");
  const passRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    readEnvelope()
      .then((e) => setStored(e ?? null))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 7000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    currentMode.current = mode;
  }, [mode]);
  function lock() {
    currentMode.current = "locked";
    currentVault.current = null;
    lockAfterSave.current = false;
    lockRelease.current?.();
    lockRelease.current = null;
    setVault(null);
    setJournal(emptyJournal());
    setMode("locked");
    setView("overview");
    setError("");
    setQuery("");
    setDeleteTarget(null);
    setHelp(false);
    setNotice("Vault locked. Unlock with your passphrase.");
    readEnvelope()
      .then((e) => setStored(e ?? null))
      .catch(() => {});
  }
  useEffect(() => {
    if (!mobile) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    navRef.current?.querySelector<HTMLButtonElement>(".mobile-close")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobile(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = Array.from(
        navRef.current?.querySelectorAll<HTMLElement>(
          "a[href],button:not(:disabled)",
        ) ?? [],
      );
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const resize = () => {
      if (window.innerWidth > 760) setMobile(false);
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("resize", resize);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", resize);
      previous?.focus();
    };
  }, [mobile]);
  const lockFn = useRef(lock);
  useEffect(() => {
    lockFn.current = lock;
  });
  useEffect(() => {
    if (mode !== "vault") return;
    let timer: ReturnType<typeof setTimeout>;
    const requestLock = () => {
      if (busyRef.current) {
        lockAfterSave.current = true;
        return;
      }
      lockFn.current();
    };
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(requestLock, 10 * 60 * 1000);
    };
    const hide = () => {
      if (document.visibilityState === "hidden") requestLock();
    };
    reset();
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    document.addEventListener("visibilitychange", hide);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [mode]);
  useEffect(
    () => () => {
      lockRelease.current?.();
    },
    [],
  );
  useEffect(() => {
    const show = help || deleteTarget !== null;
    if (show) {
      lastFocus.current = document.activeElement as HTMLElement;
      dialogRef.current?.showModal();
    } else if (dialogRef.current?.open) {
      dialogRef.current.close();
      lastFocus.current?.focus();
    }
  }, [help, deleteTarget]);
  async function unlock(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busyRef.current) return;
    setError("");
    const form = e.currentTarget;
    const data = new FormData(form);
    const pass = String(data.get("passphrase") || "");
    if (!stored && pass !== data.get("confirm")) {
      setError("Passphrases do not match.");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    let release: (() => void) | null = null;
    try {
      release = await acquireVaultLock();
      const latest = await readEnvelope();
      if (Boolean(latest) !== Boolean(stored))
        throw new Error(
          "The vault changed in another tab. Reload this page before continuing.",
        );
      let result;
      if (latest) result = await decryptJournal(latest, pass);
      else {
        if (data.get("consent") !== "on")
          throw new Error(
            "Confirm that you understand local storage and recovery limitations.",
          );
        const key = await deriveKey(pass);
        const j = emptyJournal();
        const envelope = await encryptJournal(j, key);
        await persistEnvelope(envelope);
        setStored(envelope);
        result = { journal: j, vault: key };
      }
      lockRelease.current = release;
      release = null;
      currentVault.current = result.vault;
      setVault(result.vault);
      setJournal(result.journal);
      currentMode.current = "vault";
      setMode("vault");
      form.reset();
      setNotice(
        latest
          ? "Your journal is unlocked."
          : "Your encrypted journal is ready. Add your first observation.",
      );
    } catch (e) {
      release?.();
      setError(errorMessage(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function commit(next: Journal, message: string): Promise<boolean> {
    if (
      currentMode.current !== mode ||
      currentMode.current === "locked" ||
      (mode === "vault" && currentVault.current !== vault)
    ) {
      setError("Journal locked while working. Unlock it and try again.");
      return false;
    }
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const valid = journalSchema.parse(next);
      if (mode === "vault") {
        if (!vault) throw new Error("Vault is locked.");
        await persistEnvelope(await encryptJournal(valid, vault));
      }
      setJournal(valid);
      setNotice(message);
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
      if (lockAfterSave.current) {
        lockAfterSave.current = false;
        lockFn.current();
      }
    }
  }
  function navigate(v: View) {
    setView(v);
    setMobile(false);
    setError("");
    setQuery("");
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() =>
      document.getElementById("main-content")?.focus(),
    );
  }
  async function removeRecord() {
    if (!deleteTarget) return;
    if (deleteTarget === "vault") {
      if (mode !== "vault") return;
      try {
        if (busyRef.current) return;
        busyRef.current = true;
        setBusy(true);
        await deleteVault();
        setStored(null);
        lock();
        setNotice(
          "Encrypted journal removed from this browser. Exported files are not deleted.",
        );
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    } else {
      await commit(
        {
          ...journal,
          checkins: journal.checkins.filter((c) => c.id !== deleteTarget),
          labs: journal.labs.filter((l) => l.id !== deleteTarget),
        },
        "Entry deleted.",
      );
    }
    setDeleteTarget(null);
  }
  function startDemo() {
    currentMode.current = "demo";
    setMode("demo");
    setJournal(demoJournal());
    setError("");
    setView("overview");
    setNotice(
      "Fictional demo loaded. Changes stay in memory and disappear on reload.",
    );
  }
  const recent = recurring(journal.checkins, today());
  const latest = latestLabs(journal.labs);
  const flagged = latest.filter(
    (l) =>
      classify(l) === "Below report range" ||
      classify(l) === "Above report range",
  );
  const events = [
    ...journal.checkins.map((c) => ({
      id: c.id,
      date: c.date,
      title: c.symptoms.join(" · "),
      description: c.note || `Self-rated intensity ${c.severity}/10`,
      kind: "checkin" as const,
      severity: c.severity,
    })),
    ...journal.labs.map((l) => ({
      id: l.id,
      date: l.date,
      title: catalog[l.test].label,
      description: `${l.value} ${l.unit} · ${l.lab}`,
      kind: "lab" as const,
      lab: l,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const filtered = events.filter((e) =>
    `${e.title} ${e.description} ${e.date}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div
      className="app-shell"
      data-aurora-paused={motionPaused || reducedMotion}
    >
      <a href="#main-content" className="skip">
        Skip to content
      </a>
      <aside
        ref={navRef}
        role={mobile ? "dialog" : undefined}
        aria-modal={mobile ? true : undefined}
        className={`sidebar ${mobile ? "is-open" : ""}`}
        aria-label="Main navigation"
      >
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
        >
          <span className="brand-mark">
            <I.Heart size={23} />
          </span>
          <span>
            health<span className="brand-light aurora-wordmark">assist</span>
            <small>PERSONAL NOTEBOOK</small>
          </span>
        </a>
        <button
          className="icon-button mobile-close"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        >
          <I.X />
        </button>
        <p className="nav-caption">YOUR WORKSPACE</p>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${view === n.id ? "active" : ""}`}
              onClick={() => navigate(n.id)}
              aria-current={view === n.id ? "page" : undefined}
            >
              <n.icon size={19} />
              {n.label}
              {view === n.id && <span className="active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="nav-item motion-control"
            disabled={reducedMotion}
            aria-pressed={motionPaused || reducedMotion}
            onClick={() => setMotionPaused((paused) => !paused)}
            title={
              reducedMotion
                ? "Motion is disabled by your system preference"
                : "Pause or resume the decorative aurora"
            }
          >
            {motionPaused || reducedMotion ? (
              <I.Play size={18} />
            ) : (
              <I.Pause size={18} />
            )}
            {reducedMotion
              ? "Reduced motion on"
              : motionPaused
                ? "Resume aurora"
                : "Pause aurora"}
          </button>
          <div className="local-card">
            <I.ShieldCheck size={23} />
            <strong>Private by design.</strong>
            <p>
              {mode === "vault"
                ? "Encrypted on this browser. No health data sent to a server."
                : "No account. No health-data uploads. Your story stays with you."}
            </p>
            <button className="text-link" onClick={() => navigate("settings")}>
              How privacy works <I.ArrowRight size={15} />
            </button>
          </div>
          <button
            className={`nav-item ${view === "sources" ? "active" : ""}`}
            onClick={() => navigate("sources")}
          >
            <I.BookOpen size={19} />
            Sources & safety
          </button>
          <button
            className={`nav-item ${view === "settings" ? "active" : ""}`}
            onClick={() => navigate("settings")}
          >
            <I.SlidersHorizontal size={19} />
            Your data
          </button>
          <div className="sidebar-foot">
            <span className="avatar">{mode === "demo" ? "D" : "Y"}</span>
            <div>
              <strong>
                {mode === "demo" ? "Demo workspace" : "Personal workspace"}
              </strong>
              <small>
                {mode === "vault"
                  ? "Encrypted journal"
                  : mode === "demo"
                    ? "Fictional sample data"
                    : "Local-first · v2.0"}
              </small>
            </div>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell" inert={mobile}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
              aria-expanded={mobile}
            >
              <I.Menu />
            </button>
            <span>Workspace</span>
            <I.ChevronRight size={14} />
            <strong>
              {nav.find((n) => n.id === view)?.label ??
                (view === "sources" ? "Sources & safety" : "Your data")}
            </strong>
          </div>
          <div className="top-actions">
            <span className="privacy-badge">
              <span />
              {mode === "vault"
                ? "Encrypted · unlocked"
                : mode === "demo"
                  ? "Demo · not saved"
                  : "Browser only"}
            </span>
            <button
              className="icon-button"
              aria-label="About Health Assist"
              onClick={() => setHelp(true)}
            >
              <I.CircleHelp size={19} />
            </button>
            {mode === "vault" && (
              <button
                className="button small ghost"
                onClick={lock}
                disabled={busy}
              >
                <I.LockKeyhole size={15} />
                Lock
              </button>
            )}
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {mode !== "locked" && (
            <div className={`mode-banner ${mode === "demo" ? "demo" : ""}`}>
              <span>
                {mode === "demo" ? (
                  <I.FlaskConical size={16} />
                ) : (
                  <I.LockKeyhole size={16} />
                )}{" "}
                {mode === "demo" ? (
                  <>
                    <strong>Explore the demo.</strong> All entries are
                    fictional. Changes are not saved.
                  </>
                ) : (
                  <>
                    Encrypted journal · locks when you leave this tab or after
                    10 minutes idle.
                  </>
                )}
              </span>
              {mode === "demo" && (
                <button
                  onClick={() => {
                    setJournal(emptyJournal());
                    currentMode.current = "locked";
                    setMode("locked");
                    setNotice("");
                    navigate("overview");
                  }}
                >
                  Create your journal <I.ArrowRight size={14} />
                </button>
              )}
            </div>
          )}
          {error && (
            <div className="alert error" role="alert">
              <I.TriangleAlert size={18} />
              <p>{error}</p>
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <I.X size={17} />
              </button>
            </div>
          )}
          {mode === "locked" ? (
            <section className="welcome">
              <div className="welcome-copy">
                <Aurora variant="welcome" />
                <p className="eyebrow">
                  <span className="tiny-line" /> A LITTLE CONTEXT GOES A LONG
                  WAY
                </p>
                <h1>
                  Your health.
                  <br />
                  Your story.
                  <br />
                  <em className="aurora-ink">Better connected.</em>
                </h1>
                <p className="welcome-lede">
                  Make sense of your observations, keep lab results in
                  perspective, and arrive at your next appointment prepared.
                </p>
                <div className="welcome-points">
                  <div>
                    <I.Activity />
                    <span>
                      <strong>More than a single check-in</strong>
                      <small>
                        Connect observations across days, not just a chat
                        session.
                      </small>
                    </span>
                  </div>
                  <div>
                    <I.FlaskConical />
                    <span>
                      <strong>Lab results, without guesswork</strong>
                      <small>
                        Transparent comparisons using your report’s own ranges.
                      </small>
                    </span>
                  </div>
                  <div>
                    <I.ShieldCheck />
                    <span>
                      <strong>Your information stays yours</strong>
                      <small>
                        Encrypted in this browser. No LLM or account required.
                      </small>
                    </span>
                  </div>
                </div>
                <button
                  className="button secondary demo-button"
                  onClick={startDemo}
                  disabled={loading || busy}
                >
                  Explore with fictional data <I.ArrowRight size={17} />
                </button>
                <p className="fineprint">
                  An independent portfolio project. Not a medical device.
                </p>
              </div>
              <div className="welcome-panel">
                <span className="square-icon">
                  <I.LockKeyhole size={24} />
                </span>
                <h2>
                  {stored ? "Welcome back." : "A private space to begin."}
                </h2>
                <p>
                  {stored
                    ? "Unlock the journal stored in this browser."
                    : "Create an encrypted journal on this device. No sign-up, no cloud health-data storage."}
                </p>
                {loading ? (
                  <p role="status">Checking browser storage…</p>
                ) : (
                  <form onSubmit={unlock}>
                    <label htmlFor="passphrase">
                      {stored ? "Your passphrase" : "Choose a passphrase"}
                    </label>
                    <input
                      ref={passRef}
                      id="passphrase"
                      name="passphrase"
                      type="password"
                      minLength={12}
                      maxLength={256}
                      autoComplete={
                        stored ? "current-password" : "new-password"
                      }
                      required
                      disabled={busy}
                      placeholder="At least 12 characters"
                    />
                    {!stored && (
                      <>
                        <label htmlFor="confirm">Confirm passphrase</label>
                        <input
                          id="confirm"
                          name="confirm"
                          type="password"
                          minLength={12}
                          maxLength={256}
                          autoComplete="new-password"
                          required
                          disabled={busy}
                        />
                        <label className="check-label">
                          <input
                            type="checkbox"
                            name="consent"
                            required
                            disabled={busy}
                          />
                          <span>
                            I understand that clearing browser data deletes my
                            journal, and a lost passphrase cannot be recovered.
                          </span>
                        </label>
                      </>
                    )}
                    <button
                      className="button primary full"
                      type="submit"
                      disabled={busy}
                    >
                      {busy
                        ? "Securing your journal…"
                        : stored
                          ? "Unlock journal"
                          : "Create private journal"}
                      <I.ArrowRight size={17} />
                    </button>
                  </form>
                )}
                <div className="panel-foot">
                  <I.LockKeyhole size={14} />
                  <span>AES-GCM encryption · passphrase stays in memory</span>
                </div>
                {stored && (
                  <p className="fineprint">
                    Forgot your passphrase? There is no recovery service. You
                    can still explore the demo or restore an encrypted backup
                    under Your data after unlocking a journal.
                  </p>
                )}
              </div>
            </section>
          ) : (
            <>
              {view === "overview" && (
                <>
                  <SectionTitle
                    eyebrow="YOUR PERSONAL HEALTH NOTEBOOK"
                    title="A clearer picture, over time."
                    description="A thoughtful place for the details you don’t want to forget."
                    action={
                      <button
                        className="button primary"
                        onClick={() => navigate("checkin")}
                      >
                        <I.Plus size={18} />
                        New check-in
                      </button>
                    }
                  />
                  <div className="overview-grid">
                    <section className="context-card">
                      <Aurora variant="card" />
                      <div className="card-top">
                        <span className="eyebrow light">THE BIG PICTURE</span>
                        <span className="tag light-tag">No AI guesswork</span>
                      </div>
                      <h2>
                        Your history adds
                        <br />
                        <em>the missing context.</em>
                      </h2>
                      <p>
                        {recent[0] ? (
                          <>
                            You’ve noted{" "}
                            <strong>{recent[0].symptom.toLowerCase()}</strong>{" "}
                            on{" "}
                            <strong>
                              {recent[0].days}{" "}
                              {recent[0].days === 1 ? "day" : "days"}
                            </strong>{" "}
                            in the last 30 days. Keep the timing and context
                            together for your next conversation.
                          </>
                        ) : (
                          "Start with how you’re feeling today. Over time, your journal will connect recurring observations and keep the details easy to find."
                        )}
                      </p>
                      <button
                        className="button cream"
                        onClick={() => navigate("visit")}
                      >
                        Prepare for a visit <I.ArrowRight size={17} />
                      </button>
                      <div className="context-caption">
                        <I.BookOpen size={14} />A record of observations, not an
                        explanation of their cause.
                      </div>
                    </section>
                    <section className="card next-step">
                      <div className="card-top">
                        <span className="eyebrow">YOUR NEXT CONVERSATION</span>
                        <span className="square-icon soft">
                          <I.ClipboardList size={21} />
                        </span>
                      </div>
                      <h2>Bring better questions.</h2>
                      <p>{questions(journal, today())[0]}</p>
                      <div className="next-step-foot">
                        <span className="mini-label">
                          {journal.checkins.length || journal.labs.length
                            ? "Based on entries & general prompts"
                            : "A general conversation starter"}
                        </span>
                        <button
                          className="round-button"
                          aria-label="Open visit notes"
                          onClick={() => navigate("visit")}
                        >
                          <I.ArrowRight size={18} />
                        </button>
                      </div>
                    </section>
                  </div>
                  <div className="metrics">
                    <div>
                      <span className="metric-icon">
                        <I.Activity size={20} />
                      </span>
                      <div>
                        <strong>
                          {journal.checkins.length}
                          <small>check-ins</small>
                        </strong>
                        <span>Every observation has a place</span>
                      </div>
                    </div>
                    <div>
                      <span className="metric-icon">
                        <I.FlaskConical size={20} />
                      </span>
                      <div>
                        <strong>
                          {journal.labs.length}
                          <small>lab entries</small>
                        </strong>
                        <span>
                          {new Set(latest.map((l) => l.test)).size} distinct{" "}
                          {new Set(latest.map((l) => l.test)).size === 1
                            ? "test"
                            : "tests"}{" "}
                          recorded
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="metric-icon amber">
                        <I.CircleHelp size={20} />
                      </span>
                      <div>
                        <strong>
                          {flagged.length}
                          <small>outside report ranges</small>
                        </strong>
                        <span>Latest test dates · not a risk score</span>
                      </div>
                    </div>
                  </div>
                  <div className="detail-grid">
                    <section className="card">
                      <div className="section-head">
                        <div>
                          <h2>Recent observations</h2>
                          <p>The small details, kept together.</p>
                        </div>
                        <button
                          className="text-link"
                          onClick={() => navigate("history")}
                        >
                          View all <I.ArrowRight size={15} />
                        </button>
                      </div>
                      {journal.checkins.length ? (
                        <div className="observation-list">
                          {journal.checkins
                            .slice()
                            .sort((a, b) => b.date.localeCompare(a.date))
                            .slice(0, 3)
                            .map((c) => (
                              <div className="observation" key={c.id}>
                                <span className="event-icon">
                                  <I.Activity size={18} />
                                </span>
                                <div>
                                  <div className="observation-title">
                                    <strong>{c.symptoms.join(" · ")}</strong>
                                    <time dateTime={c.date}>
                                      {shortDate(c.date)}
                                    </time>
                                  </div>
                                  <p>{c.note || "No note added."}</p>
                                  <span className="mini-label">
                                    Self-rated intensity {c.severity}/10
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <Empty
                          icon={I.Activity}
                          title="Your story starts here."
                        >
                          Add a check-in to capture what you noticed and when.
                        </Empty>
                      )}
                      <button
                        className="add-row"
                        onClick={() => navigate("checkin")}
                      >
                        <I.Plus size={16} /> Add an observation
                      </button>
                    </section>
                    <section className="card">
                      <div className="section-head">
                        <div>
                          <h2>Lab notebook</h2>
                          <p>Latest test dates; same-day entries retained.</p>
                        </div>
                        <button
                          className="icon-button"
                          aria-label="Open lab notebook"
                          onClick={() => navigate("labs")}
                        >
                          <I.ArrowUpRight size={18} />
                        </button>
                      </div>
                      {latest.length ? (
                        <div className="lab-peek">
                          {latest.slice(0, 3).map((l) => (
                            <div key={l.id}>
                              <div className="lab-peek-title">
                                <strong>{catalog[l.test].label}</strong>
                                <span>
                                  {fmt(l.value)} <small>{l.unit}</small>
                                </span>
                              </div>
                              <Status lab={l} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Empty
                          icon={I.FlaskConical}
                          title="Results with a paper trail."
                        >
                          Add values and intervals directly from your lab
                          report.
                        </Empty>
                      )}
                      <p className="card-footnote">
                        <I.CircleHelp size={15} />
                        Report ranges are not a diagnosis. In-range results do
                        not rule out illness.
                      </p>
                    </section>
                  </div>
                  <div className="source-strip">
                    <I.BookOpen size={20} />
                    <div>
                      <strong>Clarity comes with knowing the limits.</strong>
                      <span>
                        Read how comparisons work, what we don’t infer, and
                        where guidance comes from.
                      </span>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => navigate("sources")}
                    >
                      Our approach <I.ArrowRight size={16} />
                    </button>
                  </div>
                </>
              )}
              {view === "checkin" && (
                <>
                  <SectionTitle
                    eyebrow="NOTICE. NOTE. CONNECT."
                    title="How have you been feeling?"
                    description="Record your experience—not a diagnosis. A few details today can help a future conversation."
                  />
                  <SafetyNotice />
                  <CheckinForm
                    busy={busy}
                    onSave={async (c) => {
                      const saved = await commit(
                        { ...journal, checkins: [...journal.checkins, c] },
                        "Check-in added to your journal.",
                      );
                      if (saved && currentMode.current !== "locked")
                        navigate("history");
                      return saved;
                    }}
                    onError={setError}
                  />
                </>
              )}
              {view === "labs" && (
                <>
                  <SectionTitle
                    eyebrow="THE NUMBERS, WITH CONTEXT"
                    title="Your lab notebook."
                    description="Copy values from the original report. We never guess a test, unit, or reference interval."
                  />
                  <div className="info-banner">
                    <I.CircleHelp size={20} />
                    <p>
                      For adults organizing their own records. Not validated for
                      clinical use, pregnancy, or pediatric interpretation. Only
                      the six catalog tests and listed units are supported. A
                      result can be in range while you are unwell.
                    </p>
                  </div>
                  <LabForm
                    busy={busy}
                    existing={journal.labs}
                    onSave={(labs) =>
                      commit(
                        { ...journal, labs: [...journal.labs, ...labs] },
                        `${labs.length} lab ${labs.length === 1 ? "entry" : "entries"} saved.`,
                      )
                    }
                    onError={setError}
                  />
                  <section className="card all-labs">
                    <div className="section-head">
                      <div>
                        <h2>Recorded results</h2>
                        <p>
                          Original values preserved. Comparisons are arithmetic,
                          not clinical interpretations.
                        </p>
                      </div>
                      <span className="tag">{journal.labs.length} entries</span>
                    </div>
                    {journal.labs.length ? (
                      <div className="result-list">
                        {journal.labs
                          .slice()
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .map((l) => {
                            const comp = comparison(l, journal.labs);
                            return (
                              <article className="result-item" key={l.id}>
                                <div className="result-top">
                                  <div>
                                    <span className="mini-label">
                                      {displayDate(l.date)} · {l.lab}
                                    </span>
                                    <h3>{catalog[l.test].label}</h3>
                                  </div>
                                  <button
                                    className="icon-button danger-text"
                                    disabled={busy}
                                    aria-label={`Delete ${catalog[l.test].label} from ${l.date}`}
                                    onClick={() => setDeleteTarget(l.id)}
                                  >
                                    <I.Trash2 size={17} />
                                  </button>
                                </div>
                                <div className="result-values">
                                  <strong>
                                    {fmt(l.value)} <small>{l.unit}</small>
                                  </strong>
                                  <Status lab={l} />
                                  <span className="range-label">
                                    Report range:{" "}
                                    {l.low === null
                                      ? "not supplied"
                                      : `${l.low}–${l.high} ${l.unit}`}
                                  </span>
                                </div>
                                {comp && (
                                  <p className="comparison">
                                    {"blocked" in comp ? (
                                      comp.blocked
                                    ) : (
                                      <>
                                        {comp.delta > 0 ? "+" : ""}
                                        {fmt(comp.delta!)} {comp.unit} since{" "}
                                        {shortDate(comp.previous!.date)}
                                        {comp.percent === null
                                          ? " · percentage unavailable (previous value zero)"
                                          : ` (${comp.percent! > 0 ? "+" : ""}${fmt(comp.percent!)}%)`}
                                        .{" "}
                                        {comp.rangeChanged
                                          ? "Report interval changed. "
                                          : ""}
                                        Same lab label does not guarantee the
                                        same method. Higher/lower is not
                                        necessarily better/worse.
                                      </>
                                    )}
                                  </p>
                                )}
                                {l.note && (
                                  <p className="result-note">{l.note}</p>
                                )}
                              </article>
                            );
                          })}
                      </div>
                    ) : (
                      <Empty
                        icon={I.FlaskConical}
                        title="No results recorded yet."
                      >
                        Start with a single verified value, or import the exact
                        CSV template above.
                      </Empty>
                    )}
                  </section>
                </>
              )}
              {view === "history" && (
                <>
                  <SectionTitle
                    eyebrow="A RECORD, NOT A RESET"
                    title="Your health, in sequence."
                    description="Observations and lab entries share one timeline. Nothing here implies cause and effect."
                    action={
                      <button
                        className="button primary"
                        onClick={() => navigate("checkin")}
                      >
                        <I.Plus size={17} />
                        Add check-in
                      </button>
                    }
                  />
                  <div className="timeline-tools">
                    <label className="search-field">
                      <I.Search size={18} />
                      <input
                        aria-label="Search timeline"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search observations, tests, or dates…"
                      />
                    </label>
                    <span className="mini-label">
                      {filtered.length}{" "}
                      {filtered.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                  <div className="timeline-layout">
                    <section className="card timeline">
                      {filtered.length ? (
                        filtered.map((e) => (
                          <article key={e.id} className="timeline-item">
                            <div className="timeline-date">
                              <time dateTime={e.date}>{shortDate(e.date)}</time>
                              <small>{e.date.slice(0, 4)}</small>
                            </div>
                            <span
                              className={`event-icon ${e.kind === "lab" ? "lab-event" : ""}`}
                            >
                              {e.kind === "lab" ? (
                                <I.FlaskConical size={18} />
                              ) : (
                                <I.Activity size={18} />
                              )}
                            </span>
                            <div className="timeline-copy">
                              <span className="mini-label">
                                {e.kind === "lab"
                                  ? "LAB ENTRY"
                                  : `CHECK-IN · INTENSITY ${e.severity}/10`}
                              </span>
                              <h3>{e.title}</h3>
                              <p>{e.description}</p>
                              {e.kind === "lab" && <Status lab={e.lab} />}
                            </div>
                            <button
                              className="icon-button danger-text"
                              aria-label={`Delete ${e.title} from ${e.date}`}
                              disabled={busy}
                              onClick={() => setDeleteTarget(e.id)}
                            >
                              <I.Trash2 size={16} />
                            </button>
                          </article>
                        ))
                      ) : (
                        <Empty
                          icon={I.History}
                          title={
                            query
                              ? "No matching entries."
                              : "Nothing recorded yet."
                          }
                        >
                          {query
                            ? "Try another word or date."
                            : "Your first check-in will appear here."}
                        </Empty>
                      )}
                    </section>
                    <aside className="card pattern-card">
                      <span className="square-icon soft">
                        <I.Activity size={22} />
                      </span>
                      <h2>Repeated observations</h2>
                      <p>Last 30 days · counts, not correlations.</p>
                      {recent.length ? (
                        <ul className="repeat-list">
                          {recent.map((r) => (
                            <li key={r.symptom}>
                              <strong>{r.symptom}</strong>
                              <span>
                                {r.days} {r.days === 1 ? "day" : "days"} ·{" "}
                                {r.count} {r.count === 1 ? "entry" : "entries"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="muted-text">
                          Add check-ins to build context.
                        </p>
                      )}
                      <p className="fineprint">
                        Multiple entries on one day count as one day. No cause,
                        diagnosis, or risk prediction is inferred.
                      </p>
                    </aside>
                  </div>
                </>
              )}
              {view === "visit" && (
                <>
                  <SectionTitle
                    eyebrow="FROM NOTES TO CONVERSATION"
                    title="Arrive a little more prepared."
                    description="A transparent, history-informed brief you can review and share with your clinician."
                    action={
                      <button
                        className="button primary"
                        onClick={() =>
                          download(
                            visitSummary(journal, today()),
                            `health-assist-visit-${today()}.txt`,
                          )
                        }
                      >
                        <I.Download size={17} />
                        Export visit notes
                      </button>
                    }
                  />
                  <div className="info-banner">
                    <I.LockKeyhole size={19} />
                    <p>
                      Exported visit notes are <strong>not encrypted</strong>{" "}
                      and may contain sensitive information. Share only with
                      people you trust. Your full history is included.
                    </p>
                  </div>
                  <div className="visit-grid">
                    <section className="card questions">
                      <p className="eyebrow">A STARTING POINT, NOT A SCRIPT</p>
                      <h2>Questions worth bringing.</h2>
                      <ol>
                        {questions(journal, today()).map((q, i) => (
                          <li key={q}>
                            <span>{String(i + 1).padStart(2, "0")}</span>
                            <p>{q}</p>
                          </li>
                        ))}
                      </ol>
                    </section>
                    <section className="card visit-context">
                      <h2>What this brief uses</h2>
                      <div>
                        <I.Activity size={21} />
                        <span>
                          <strong>{journal.checkins.length} check-ins</strong>
                          <small>
                            Recurrence questions use the last 30 days.
                          </small>
                        </span>
                      </div>
                      <div>
                        <I.FlaskConical size={21} />
                        <span>
                          <strong>{journal.labs.length} lab entries</strong>
                          <small>
                            Questions flag latest values outside your supplied
                            bounds.
                          </small>
                        </span>
                      </div>
                      <div>
                        <I.ShieldCheck size={21} />
                        <span>
                          <strong>Zero inferred diagnoses</strong>
                          <small>
                            No disease ranking, prescriptions, or generated
                            medical claims.
                          </small>
                        </span>
                      </div>
                      <p className="fineprint">
                        Bring the original reports and a current list of
                        medicines and supplements. All app records are
                        user-entered and unverified.
                      </p>
                    </section>
                  </div>
                  <section className="card preview">
                    <div className="section-head">
                      <h2>Export preview</h2>
                      <span className="tag">Plain text · portable</span>
                    </div>
                    <pre
                      tabIndex={0}
                      role="region"
                      aria-label="Visit note preview"
                    >
                      {visitSummary(journal, today())}
                    </pre>
                  </section>
                </>
              )}
            </>
          )}
          {view === "settings" && mode !== "locked" && (
            <>
              <SectionTitle
                eyebrow="OWN YOUR INFORMATION"
                title="Your data. Your decision."
                description="No cloud database, hidden tracking, or health-data API calls. Understand the trade-offs."
              />
              <DataSettings
                mode={mode}
                journal={journal}
                vault={vault}
                busy={busy}
                onImport={async (value) => {
                  const ok = await commit(
                    value,
                    "Backup restored. Existing entries were replaced.",
                  );
                  return ok;
                }}
                onDelete={() => setDeleteTarget("vault")}
                onError={setError}
              />
            </>
          )}
          {view === "sources" && mode !== "locked" && <Sources />}
          {mode === "locked" && (view === "sources" || view === "settings") && (
            <Sources />
          )}
          <footer className="footer">
            <span>
              Health Assist <span className="footer-dot">·</span> A personal
              notebook, not a clinician.
            </span>
            <button onClick={() => setHelp(true)}>
              Limitations & emergency guidance <I.ArrowUpRight size={14} />
            </button>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <I.CheckCircle2 size={18} />
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <I.X size={16} />
          </button>
        </div>
      )}
      <dialog
        ref={dialogRef}
        className="modal"
        onCancel={(e) => {
          if (busy) {
            e.preventDefault();
            return;
          }
          setHelp(false);
          setDeleteTarget(null);
        }}
        aria-labelledby="modal-title"
      >
        <div className="modal-heading">
          <h2 id="modal-title">
            {help
              ? "A notebook. Not a clinician."
              : deleteTarget === "vault"
                ? "Delete this encrypted journal?"
                : "Delete this entry?"}
          </h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            disabled={busy}
            onClick={() => {
              setHelp(false);
              setDeleteTarget(null);
            }}
          >
            <I.X size={20} />
          </button>
        </div>
        {help ? (
          <>
            <p>
              Health Assist organizes your observations and report values. It
              does not diagnose, prescribe, check medication interactions,
              monitor you, or decide whether you are safe.
            </p>
            <SafetyNotice />
            <p>Emergency examples include:</p>
            <ul>
              {emergencyExamples.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p>
              <strong>This list is not exhaustive.</strong> No automated
              free-text emergency detection is performed. If you’re worried,
              seek professional help even if no example matches.
            </p>
            <a
              className="text-link"
              href={sources[1].url}
              target="_blank"
              rel="noreferrer"
            >
              MedlinePlus emergency guidance <I.ExternalLink size={15} />
            </a>
          </>
        ) : (
          <>
            <p>
              {deleteTarget === "vault"
                ? "This permanently removes the encrypted journal from this browser. There is no undo. Export a backup first if you want to keep your records. Exported files and browser/device backups are not removed."
                : "This removes the saved observation or lab value. There is no undo."}
            </p>
            <div className="modal-actions">
              <button
                className="button secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={busy}
              >
                Keep {deleteTarget === "vault" ? "journal" : "entry"}
              </button>
              <button
                className="button danger"
                onClick={removeRecord}
                disabled={busy}
              >
                {busy ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
