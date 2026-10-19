"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-screen">
      <section className="card data-card">
        <h1>Let’s try that again.</h1>
        <p>
          The screen could not load. Saved encrypted records are separate from
          this page, but unsaved changes may be lost. No error details or
          journal text have been sent to an analytics service.
        </p>
        <button className="button primary" onClick={() => reset()}>
          Try again
        </button>
        <p className="fineprint">
          If this repeats, reload and unlock your journal. Use synthetic
          information when reporting an issue.
        </p>
      </section>
    </main>
  );
}
