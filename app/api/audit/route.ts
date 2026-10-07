import { json, preflight } from "@/lib/cors";
import { listAudit } from "@/lib/storage";

export const OPTIONS = preflight;

export async function GET() {
  return json(await listAudit());
}
