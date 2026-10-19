"use client";
import * as I from "./icons";
import { catalog, CATALOG_VERSION, sources, testIds } from "@/lib/catalog";
import { SectionTitle, SafetyNotice } from "./ui";
export default function Sources() {
  return (
    <>
      <SectionTitle
        eyebrow="TRANSPARENT BY DEFAULT"
        title="Know what’s behind the notebook."
        description="A small, explicit knowledge base. No anonymous medical database, hidden prompts, or invented references."
      />
      <SafetyNotice />
      <div className="sources-grid">
        {sources.map((s) => (
          <a
            className="card source-card"
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noreferrer"
          >
            <I.BookOpen size={24} />
            <span className="mini-label">{s.publisher}</span>
            <h2>
              {s.title} <I.ArrowUpRight size={18} />
            </h2>
            <p>{s.purpose}</p>
            <span className="fineprint">
              Source link reviewed {s.reviewed} · not clinical validation
            </span>
          </a>
        ))}
      </div>
      <section className="card approach">
        <h2>What the app does—and deliberately doesn’t.</h2>
        <div className="approach-grid">
          <div>
            <h3>Report-aware arithmetic</h3>
            <p>
              Values are compared only with the bounds you enter. Endpoints are
              included. Missing bounds mean “No report range,” not “normal.”
              Simple supported unit scaling is explicit and test-specific.
            </p>
          </div>
          <div>
            <h3>History without hallucinations</h3>
            <p>
              Recurrence counts use distinct days in a rolling 30-day window.
              Visit questions use those counts and latest out-of-range entries.
              No relationship between symptoms and lab results is asserted.
            </p>
          </div>
          <div>
            <h3>Conservative comparisons</h3>
            <p>
              Different lab labels or ambiguous same-day draws block
              comparisons. Changes to supplied intervals are flagged. A matching
              lab label does not prove matching methods or clinical
              comparability.
            </p>
          </div>
          <div>
            <h3>No medical clearance</h3>
            <p>
              No emergency detection from free text, diagnostic scoring, drug
              dosing, or treatment suggestions. The warning-sign list is
              incomplete. This is an adult personal recordkeeping prototype, not
              a medical device.
            </p>
          </div>
        </div>
        <p className="catalog-version">
          Catalog {CATALOG_VERSION} · {testIds.length} supported tests · no
          default reference intervals
        </p>
      </section>
      <section className="card catalog-card">
        <h2>Explicit unit support</h2>
        <p>
          Test names must match an exact catalog alias. Unsupported units and
          inequality/qualitative results are rejected rather than relabeled.
        </p>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Scrollable results table"
        >
          <table>
            <thead>
              <tr>
                <th>Test</th>
                <th>Accepted units</th>
                <th>Comparison unit</th>
              </tr>
            </thead>
            <tbody>
              {testIds.map((t) => (
                <tr key={t}>
                  <td>{catalog[t].label}</td>
                  <td>{Object.keys(catalog[t].units).join(" · ")}</td>
                  <td>{catalog[t].canonical}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
