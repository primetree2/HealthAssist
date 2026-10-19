"use client";
import { useState, type FormEvent } from "react";
import * as I from "./icons";
import { emergencyExamples } from "@/lib/catalog";
import {
  checkinSchema,
  errorMessage,
  symptomOptions,
  today,
  type Journal,
} from "@/lib/schema";
export default function CheckinForm({
  busy,
  onSave,
  onError,
}: {
  busy: boolean;
  onSave: (c: Journal["checkins"][number]) => Promise<boolean>;
  onError: (s: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [severity, setSeverity] = useState(4);
  const [safety, setSafety] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      const c = checkinSchema.parse({
        id: crypto.randomUUID(),
        date: f.get("date"),
        symptoms: selected,
        severity,
        note: String(f.get("note") || ""),
        safety,
      });
      if (await onSave(c)) {
        form.reset();
        setSelected([]);
        setSeverity(4);
        setSafety("");
      }
    } catch (err) {
      onError(errorMessage(err));
    }
  }
  return (
    <form className="checkin-layout" onSubmit={submit}>
      <div className="card form-card">
        <p className="step-label">
          01 <span>THE OBSERVATION</span>
        </p>
        <label htmlFor="check-date">Date</label>
        <input
          id="check-date"
          name="date"
          type="date"
          defaultValue={today()}
          max={today()}
          min="1900-01-01"
          required
          disabled={busy}
        />
        <fieldset disabled={busy}>
          <legend>What did you notice?</legend>
          <p className="field-hint">
            Choose all that apply. Use “Other” and your note for anything else.
          </p>
          <div className="symptom-options">
            {symptomOptions.map((s) => (
              <label
                key={s}
                className={`symptom-option ${selected.includes(s) ? "selected" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(s)}
                  onChange={() =>
                    setSelected((prev) =>
                      prev.includes(s)
                        ? prev.filter((x) => x !== s)
                        : [...prev, s],
                    )
                  }
                />
                {s}
              </label>
            ))}
          </div>
        </fieldset>
        <label htmlFor="severity">
          Self-rated intensity <span className="intensity">{severity}/10</span>
        </label>
        <input
          id="severity"
          aria-describedby="intensity-hint"
          type="range"
          min={1}
          max={10}
          value={severity}
          disabled={busy}
          onChange={(e) => setSeverity(Number(e.target.value))}
        />
        <div className="range-ends">
          <span>Mild to you</span>
          <span>Strong to you</span>
        </div>
        <p id="intensity-hint" className="field-hint">
          A personal scale, not a medical severity assessment.
        </p>
        <label htmlFor="check-note">The details you’d like to remember</label>
        <textarea
          id="check-note"
          name="note"
          maxLength={1500}
          rows={5}
          placeholder="When did it start? What were you doing? What else felt different?"
          disabled={busy}
        />
        <p className="field-hint">
          Optional · 1,500 characters max. Avoid names or identifiers you don’t
          need.
        </p>
      </div>
      <div className="checkin-side">
        <section className="card form-card safety-check">
          <p className="step-label">
            02 <span>BEFORE YOU SAVE</span>
          </p>
          <h2>Don’t let a journal delay care.</h2>
          <p>
            Are you experiencing any of these warning signs, or another possible
            emergency, right now?
          </p>
          <ul>
            {emergencyExamples.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <fieldset disabled={busy}>
            <legend className="sr-only">Possible emergency right now?</legend>
            {[
              ["yes", "Yes"],
              ["no", "No — I don’t recognize these signs"],
              ["unsure", "I’m not sure"],
            ].map(([v, label]) => (
              <label className="radio-row" key={v}>
                <input
                  required
                  type="radio"
                  name="safety"
                  value={v}
                  checked={safety === v}
                  onChange={() => setSafety(v)}
                />
                {label}
              </label>
            ))}
          </fieldset>
          {(safety === "yes" || safety === "unsure") && (
            <div className="urgent" role="alert">
              <strong>
                {safety === "yes"
                  ? "Contact local emergency services now."
                  : "Seek urgent medical help if this may be an emergency."}
              </strong>
              <p>
                Do not wait for an app response. Saving a note does not contact
                anyone or arrange care.
              </p>
            </div>
          )}
          <p className="fineprint">
            Examples are not exhaustive. “No” does not mean you are safe.
            Free-text notes are not screened for emergencies.
          </p>
          <button
            className="button primary full"
            disabled={busy || !safety || selected.length === 0}
            type="submit"
          >
            <I.Plus size={17} />
            {busy ? "Saving…" : "Save observation"}
          </button>
        </section>
        <p className="form-reassurance">
          <I.LockKeyhole size={16} />
          Saved to this workspace only. No model analyzes your words.
        </p>
      </div>
    </form>
  );
}
