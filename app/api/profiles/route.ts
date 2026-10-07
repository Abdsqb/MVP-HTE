import { json, preflight } from "@/lib/cors";
import { listProfiles } from "@/lib/storage";

export const OPTIONS = preflight;

/** Light list for pickers (the extension's client dropdown). */
export async function GET() {
  const profiles = await listProfiles();
  return json(
    profiles.map((p) => ({
      id: p.id,
      name: p.business.legalName.value || p.sourceFileName,
      reviewed: p.reviewed,
      updatedAt: p.updatedAt,
    })),
  );
}
