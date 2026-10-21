import { useState } from "react";
import { ArrowUpRight, FileText, HardDrive, Trash2 } from "lucide-react";
import type { Analysis } from "../contracts";
export function History({
  saved,
  onOpen,
  onDelete,
  onClear,
}: {
  saved: Analysis[];
  onOpen: (a: Analysis) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}) {
  const [confirmClear, setConfirmClear] = useState(false);
  return (
    <section className="history-view">
      <div className="page-heading">
        <div>
          <div className="eyebrow">SAVED ON THIS DEVICE</div>
          <h1>Your briefs, close at hand.</h1>
          <p>
            Only reports you chose to save. This is not a cloud account or
            medical record.
          </p>
        </div>
        {saved.length > 0 && (
          <button
            className="button secondary"
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 size={17} /> Delete all
          </button>
        )}
      </div>
      <div className="notice neutral">
        <HardDrive size={21} />
        <p>
          These records include health details and are stored unencrypted in
          this browser. Avoid saving on shared devices. Up to 10 reports are
          kept; records older than 30 days are excluded when loading.
        </p>
      </div>
      {confirmClear && (
        <div className="notice warning clear-confirm" role="alert">
          <p>
            Delete all saved briefs from this browser? Export any records you
            want to keep first.
          </p>
          <button
            className="button secondary small"
            onClick={() => setConfirmClear(false)}
          >
            Cancel
          </button>
          <button
            className="button primary small"
            onClick={() => {
              onClear();
              setConfirmClear(false);
            }}
          >
            Confirm delete all
          </button>
        </div>
      )}
      {saved.length === 0 ? (
        <div className="panel empty-state">
          <FileText size={32} />
          <h2>Nothing saved. That’s the default.</h2>
          <p>
            After an analysis, choose “Save on this device” if you want to keep
            a copy here.
          </p>
        </div>
      ) : (
        <div className="history-list">
          {saved.map((a) => (
            <article className="panel history-card" key={a.id}>
              <div className="history-icon">
                <FileText size={25} />
              </div>
              <div>
                <h2>{a.extraction.filename || "Health conversation brief"}</h2>
                <p>
                  {new Date(a.created_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  · {a.counts.total} observations
                </p>
                <span>
                  {a.counts.outside} outside interval · {a.counts.review} need
                  checking
                </span>
              </div>
              <div className="history-actions">
                <button
                  className="button secondary small"
                  onClick={() => onOpen(a)}
                >
                  Open brief <ArrowUpRight size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Delete ${a.extraction.filename || "saved brief"}`}
                  onClick={() => onDelete(a.id)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
