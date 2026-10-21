export function Aurora({ hero = false }: { hero?: boolean }) {
  return (
    <div className={`aurora ${hero ? "aurora-hero" : ""}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  );
}
