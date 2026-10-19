export function GET() {
  return Response.json(
    {
      status: "ok",
      version: "2.0.1",
      healthData: "browser-only",
      llmRequired: false,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
