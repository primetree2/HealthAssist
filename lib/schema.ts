import { z } from "zod";
import { factorFor, testIds } from "./catalog";
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((s) => {
    const d = new Date(`${s}T12:00:00Z`);
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Date is not valid")
  .refine(
    (s) => s >= "1900-01-01" && s <= today(),
    "Date must be between 1900 and today",
  );
const id = z.string().min(1).max(80);
export const symptomOptions = [
  "Fatigue",
  "Headache",
  "Dizziness",
  "Cough",
  "Nausea",
  "Abdominal discomfort",
  "Sleep difficulty",
  "Other",
] as const;
export const checkinSchema = z
  .object({
    id,
    date: dateSchema,
    symptoms: z
      .array(z.enum(symptomOptions))
      .min(1, "Choose at least one observation")
      .max(8)
      .refine(
        (v) => new Set(v).size === v.length,
        "Repeated observation labels are not allowed",
      ),
    severity: z.number().int().min(1).max(10),
    note: z.string().trim().max(1500),
    safety: z.enum(["yes", "no", "unsure"]),
  })
  .strict();
export const labSchema = z
  .object({
    id,
    date: dateSchema,
    test: z.enum(
      testIds as [(typeof testIds)[number], ...(typeof testIds)[number][]],
    ),
    value: z.number().finite().min(0).max(1e9),
    unit: z.string().max(30),
    low: z.number().finite().min(0).max(1e9).nullable(),
    high: z.number().finite().min(0).max(1e9).nullable(),
    lab: z.string().trim().min(1, "Enter the lab/report label").max(80),
    note: z.string().trim().max(500),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (factorFor(v.test, v.unit) === undefined)
      ctx.addIssue({
        code: "custom",
        path: ["unit"],
        message:
          "Unit not supported for this test. Never substitute a different unit.",
      });
    if ((v.low === null) !== (v.high === null))
      ctx.addIssue({
        code: "custom",
        path: ["low"],
        message: "Provide both report bounds, or leave both empty.",
      });
    if (v.low !== null && v.high !== null && v.low >= v.high)
      ctx.addIssue({
        code: "custom",
        path: ["high"],
        message: "The upper bound must exceed the lower bound.",
      });
  });
export const journalSchema = z
  .object({
    version: z.literal(1),
    checkins: z.array(checkinSchema).max(5000),
    labs: z.array(labSchema).max(5000),
  })
  .strict()
  .superRefine((v, ctx) => {
    const ids = [...v.checkins, ...v.labs].map((x) => x.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", message: "Duplicate record identifiers" });
  });
export type Checkin = z.infer<typeof checkinSchema>;
export type Lab = z.infer<typeof labSchema>;
export type Journal = z.infer<typeof journalSchema>;
export const emptyJournal = (): Journal => ({
  version: 1,
  checkins: [],
  labs: [],
});
export function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError)
    return error.issues.map((i) => i.message).join(" ");
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
