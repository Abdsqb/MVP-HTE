import { json, preflight } from "@/lib/cors";
import { deleteMapping } from "@/lib/storage";

export const OPTIONS = preflight;

/** "Forget" a portal: the next fill re-learns it with AI. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ signature: string }> }) {
  await deleteMapping((await params).signature);
  return json({ ok: true });
}
