import { analysisSchema } from "./contracts";
import type { Analysis, RawObservation } from "./contracts";
export class ApiError extends Error {
  requestId: string | null;
  constructor(message: string, id: string | null = null) {
    super(message);
    this.requestId = id;
  }
}
async function response(response: Response): Promise<Analysis> {
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      response.status === 413
        ? "This upload exceeds the hosting limit. Choose a file under 4 MB."
        : "The server returned an unreadable response. Please retry.",
      response.headers.get("x-request-id"),
    );
  }
  if (!response.ok) {
    const d = data as { error?: { message?: string } };
    throw new ApiError(
      d?.error?.message ||
        `The request failed (${response.status}). Please retry.`,
      response.headers.get("x-request-id"),
    );
  }
  const parsed = analysisSchema.safeParse(data);
  if (!parsed.success)
    throw new ApiError(
      "The response did not pass validation. Your inputs are still here; please retry.",
      response.headers.get("x-request-id"),
    );
  return parsed.data;
}
export async function analyze(form: FormData, signal: AbortSignal) {
  return response(
    await fetch("/api/analyze", {
      method: "POST",
      body: form,
      signal,
      cache: "no-store",
    }),
  );
}
export async function review(
  analysis: Analysis,
  observations: RawObservation[],
  explain: boolean,
  allowCloud: boolean,
  signal: AbortSignal,
) {
  const result = await response(
    await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        observations,
        context: analysis.context,
        symptoms: analysis.symptoms,
        consent_processing: true,
        allow_cloud: allowCloud,
        explain,
      }),
      signal,
      cache: "no-store",
    }),
  );
  return {
    ...result,
    extraction: {
      ...analysis.extraction,
      methods: [...new Set([...analysis.extraction.methods, "User review"])],
    },
  };
}
