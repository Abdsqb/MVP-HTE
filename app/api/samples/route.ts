import { json, preflight } from "@/lib/cors";
import { listSamples } from "@/lib/samples";

export const OPTIONS = preflight;

export async function GET() {
  return json(await listSamples());
}
