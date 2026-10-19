import { catalog, CATALOG_VERSION, sources } from "@/lib/catalog";
export function GET() {
  return Response.json(
    {
      version: CATALOG_VERSION,
      catalog,
      sources,
      notice:
        "No default reference intervals. Use bounds from the original lab report.",
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
