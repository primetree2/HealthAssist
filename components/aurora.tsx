/** Decorative only: no canvas, JavaScript animation loop, or remote assets. */
export default function Aurora({ variant }: { variant: "welcome" | "card" }) {
  return (
    <span className={`aurora aurora--${variant}`} aria-hidden="true">
      <span className="aurora__ribbon aurora__ribbon--sage" />
      <span className="aurora__ribbon aurora__ribbon--blue" />
      <span className="aurora__ribbon aurora__ribbon--lilac" />
    </span>
  );
}
