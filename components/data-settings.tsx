"use client";
import { useState, type FormEvent } from "react";
import * as I from "./icons";
import { errorMessage, type Journal } from "@/lib/schema";
import {
  decryptJournal,
  encryptJournal,
  type Envelope,
  type VaultKey,
} from "@/lib/vault";
import type { Mode } from "./types";
import { download } from "./ui";
export default function DataSettings({
  mode,
  journal,
  vault,
  busy,
  onImport,
  onDelete,
  onError,
}: {
  mode: Mode;
  journal: Journal;
  vault: VaultKey | null;
  busy: boolean;
  onImport: (j: Journal) => Promise<boolean>;
  onDelete: () => void;
  onError: (s: string) => void;
}) {
  const [restore, setRestore] = useState<Envelope | null>(null);
  const [working, setWorking] = useState(false);
  const [ack, setAck] = useState(false);
  async function backup() {
    if (!vault) return;
    setWorking(true);
    try {
      const e = await encryptJournal(journal, vault);
      download(
        JSON.stringify(e),
        "health-assist-encrypted-backup.json",
        "application/json",
      );
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setWorking(false);
    }
  }
  async function loadFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 12_000_000)
        throw new Error("Backup must be smaller than 12 MB.");
      const raw = JSON.parse(await file.text());
      const { validateEnvelope } = await import("@/lib/vault");
      setRestore(validateEnvelope(raw));
      setAck(false);
    } catch (e) {
      setRestore(null);
      onError(errorMessage(e));
    }
  }
  async function restoreBackup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!restore || !ack) return;
    const form = e.currentTarget;
    const pass = String(new FormData(form).get("backup-pass") || "");
    setWorking(true);
    try {
      const result = await decryptJournal(restore, pass);
      if (await onImport(result.journal)) {
        setRestore(null);
        form.reset();
      }
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setWorking(false);
    }
  }
  return (
    <div className="data-grid">
      <section className="card data-card">
        <span className="square-icon soft">
          <I.ShieldCheck />
        </span>
        <h2>Local first. Encrypted at rest.</h2>
        <p>
          {mode === "demo"
            ? "You are using fictional, in-memory demo data. To keep your own records, exit the demo and create a journal."
            : "Your journal is encrypted using AES-256-GCM and a passphrase-derived key (PBKDF2-SHA-256, 310,000 iterations) before it is saved to IndexedDB."}
        </p>
        <ul className="plain-list">
          <li>Keys remain in memory while unlocked.</li>
          <li>Locks on tab backgrounding and after 10 minutes idle.</li>
          <li>No password reset, account sync, or remote backup.</li>
          <li>Browser data clearing or device loss can erase your journal.</li>
          <li>
            Encryption does not protect an unlocked or compromised device.
          </li>
        </ul>
      </section>
      <section className="card data-card">
        <span className="square-icon soft">
          <I.Download />
        </span>
        <h2>Keep a backup.</h2>
        <p>
          Download an encrypted file you can restore later with its original
          passphrase. Store it somewhere safe. This is not a plaintext JSON
          export.
        </p>
        <button
          className="button primary"
          disabled={mode !== "vault" || busy || working}
          onClick={backup}
        >
          <I.Download size={17} />
          {working ? "Working…" : "Export encrypted backup"}
        </button>
        <p className="fineprint">
          Available in your private journal, not demo mode. Visit-note exports
          are plaintext and handled separately.
        </p>
      </section>
      <section className="card data-card">
        <span className="square-icon soft">
          <I.Upload />
        </span>
        <h2>Restore an encrypted backup.</h2>
        <p>
          This replaces the current journal. Export a backup first. Records are
          validated before anything is changed; imports are re-encrypted using
          the current journal’s key.
        </p>
        <label htmlFor="backup-file">Choose backup JSON</label>
        <input
          id="backup-file"
          type="file"
          accept=".json,application/json"
          disabled={mode !== "vault" || busy || working}
          onChange={(e) => {
            void loadFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {restore && (
          <form onSubmit={restoreBackup}>
            <label htmlFor="backup-pass">Backup’s original passphrase</label>
            <input
              id="backup-pass"
              name="backup-pass"
              type="password"
              minLength={12}
              maxLength={256}
              autoComplete="off"
              required
              disabled={busy || working}
            />
            <label className="check-label">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                required
                disabled={working || busy}
              />
              <span>
                Replace all entries in this journal with the backup’s entries.
              </span>
            </label>
            <button
              className="button primary"
              disabled={!ack || busy || working}
            >
              {working ? "Restoring…" : "Unlock & replace journal"}
            </button>
          </form>
        )}
      </section>
      <section className="card data-card danger-card">
        <span className="square-icon danger-icon">
          <I.Trash2 />
        </span>
        <h2>Start fresh.</h2>
        <p>
          Permanently remove this journal’s encrypted data from this browser.
          Exported files and operating-system/browser backups are outside the
          app’s control.
        </p>
        <button
          className="button danger-outline"
          onClick={onDelete}
          disabled={mode !== "vault" || busy || working}
        >
          <I.Trash2 size={17} />
          Delete browser journal
        </button>
        <p className="fineprint">
          Demo data can be discarded by reloading. No health information is sent
          to the app’s server.
        </p>
      </section>
    </div>
  );
}
