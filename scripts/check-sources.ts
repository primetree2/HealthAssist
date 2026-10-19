import { sources } from "../lib/catalog";
async function main() {
  let failed = false;
  for (const source of sources) {
    try {
      const response = await fetch(source.url, {
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      });
      console.log(
        `${response.status} ${source.url} (last human content check: ${source.reviewed})`,
      );
      if (!response.ok) failed = true;
    } catch {
      console.error(`Could not load ${source.url}`);
      failed = true;
    }
  }
  console.log(
    "Availability checks do NOT validate medical content. Follow docs/SOURCES.md for human review.",
  );
  if (failed) process.exitCode = 1;
}
void main();
