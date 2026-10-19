"use client";
import type { ReactNode } from "react";
import * as I from "./icons";
import type { Lab } from "@/lib/schema";
import { classify } from "@/lib/engine";
export const displayDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export const shortDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
  });
export const fmt = (n: number) => Number(n.toFixed(2)).toString();
export function download(
  content: string,
  filename: string,
  type = "text/plain",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export function Status({ lab }: { lab: Lab }) {
  const s = classify(lab);
  return (
    <span
      className={`status ${s.startsWith("Within") ? "neutral-good" : s.startsWith("No") ? "muted" : "attention"}`}
    >
      {s.startsWith("Within") ? (
        <I.Check size={13} />
      ) : s.startsWith("No") ? (
        <I.CircleHelp size={13} />
      ) : (
        <I.ArrowDownRight size={13} />
      )}{" "}
      {s}
    </span>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lede">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Empty({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof I.Heart;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <Icon size={30} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function SafetyNotice() {
  return (
    <div className="safety-note">
      <I.TriangleAlert size={18} />
      <p>
        <strong>Not for emergencies or diagnosis.</strong> If symptoms are
        severe, sudden, worsening, or concerning, seek medical help. If you may
        be having an emergency, contact local emergency services now. Do not
        wait for this app.
      </p>
    </div>
  );
}
