import { z } from "zod";
export const contextSchema = z.object({
  age: z.number().int().min(0).max(120).nullable(),
  reference_sex: z.enum(["female", "male", "unspecified"]),
  pregnancy: z.enum(["yes", "no", "unspecified"]),
  fasting: z.enum(["yes", "no", "unspecified"]),
  medications: z.string().max(1000),
  emergency_symptoms: z.boolean(),
});
export const rawSchema = z.object({
  name: z.string().min(1).max(160),
  result: z.string().max(160),
  unit: z.string().max(80),
  reference_text: z.string().max(240),
  flag: z.string().max(30),
  page: z.number().int().min(1).max(15).nullable(),
  source_kind: z.enum([
    "table",
    "text",
    "csv",
    "xlsx",
    "docx",
    "json",
    "fhir",
    "cloud_ocr",
    "user",
  ]),
  source_text: z.string().max(600),
  source_row: z.number().int().nullable(),
  source_section: z.string().max(100),
  report_date: z.string().max(40),
  issues: z.array(z.string()).max(12),
  user_verified: z.boolean(),
});
const observationSchema = z.object({
  id: z.string(),
  raw: rawSchema,
  canonical_name: z.string().nullable(),
  category: z.string(),
  value: z.number().nullable(),
  comparator: z.string(),
  canonical_value: z.number().nullable(),
  canonical_unit: z.string().nullable(),
  reference_low: z.number().nullable(),
  reference_high: z.number().nullable(),
  status: z.enum([
    "within_report_range",
    "above_report_range",
    "below_report_range",
    "needs_review",
    "reference_unavailable",
    "qualitative",
    "not_reported",
  ]),
  explanation: z.string(),
  issues: z.array(z.string()),
  name_match: z.enum(["exact", "unknown", "ambiguous"]),
});
export const analysisSchema = z.object({
  schema_version: z.literal("2.0"),
  id: z.string().uuid(),
  created_at: z.string().datetime({ offset: true }),
  context: contextSchema,
  symptoms: z.string().max(4000),
  observations: z.array(observationSchema).max(300),
  counts: z.object({
    total: z.number().int(),
    within: z.number().int(),
    outside: z.number().int(),
    review: z.number().int(),
    qualitative: z.number().int(),
  }),
  extraction: z.object({
    filename: z.string().nullable(),
    format: z.string(),
    page_count: z.number().int().nullable(),
    methods: z.array(z.string()),
    warnings: z.array(z.string()),
    ignored_line_count: z.number().int(),
    unparsed_lines: z.array(z.string()),
    cloud_used: z.boolean(),
  }),
  summary: z.string(),
  safety_notices: z.array(z.string()),
  doctor_questions: z.array(z.string()),
  limitations: z.array(z.string()),
  ai: z
    .object({
      overview: z.string(),
      context_notes: z.array(
        z.object({ text: z.string(), observation_ids: z.array(z.string()) }),
      ),
      doctor_questions: z.array(z.string()),
      limitations: z.array(z.string()),
    })
    .nullable(),
  ai_status: z.enum(["not_requested", "generated", "unavailable"]),
  ai_notice: z.string().nullable(),
});
export type Analysis = z.infer<typeof analysisSchema>;
export type Observation = Analysis["observations"][number];
export type RawObservation = z.infer<typeof rawSchema>;
export type PatientContext = z.infer<typeof contextSchema>;
export type Capabilities = {
  cloud_available: boolean;
  status: string;
  rate_limit: string;
};
export type Draft = {
  age: string;
  referenceSex: PatientContext["reference_sex"];
  pregnancy: PatientContext["pregnancy"];
  fasting: PatientContext["fasting"];
  medications: string;
  symptoms: string;
  pastedText: string;
  emergency: boolean;
  consent: boolean;
  cloudConsent: boolean;
};
