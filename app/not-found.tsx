import Link from "next/link";
export default function NotFound() {
  return (
    <main className="error-screen">
      <section className="card data-card">
        <p className="eyebrow">HEALTH ASSIST · 404</p>
        <h1>A little off the path.</h1>
        <p>That page doesn’t exist. Your journal is on the main workspace.</p>
        <Link className="button primary" href="/">
          Return to workspace
        </Link>
      </section>
    </main>
  );
}
