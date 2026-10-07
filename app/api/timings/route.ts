import { z } from "zod";
import { errorJson, json, preflight } from "@/lib/cors";
import { addTiming, listTimings, newId } from "@/lib/storage";

const TimingInput = z.object({
  portal: z.string().min(1),
  mode: z.enum(["manual", "auto"]),
  seconds: z.number().nonnegative().max(60 * 60 * 24),
  clientId: z.string().nullable().optional(),
});

export const OPTIONS = preflight;

export async function GET() {
  return json(await listTimings());
}

export async function POST(req: Request) {
  const parsed = TimingInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson("Invalid timing record.");

  const record = await addTiming({
    id: newId("tm"),
    timestamp: new Date().toISOString(),
    portal: parsed.data.portal,
    mode: parsed.data.mode,
    seconds: Math.round(parsed.data.seconds * 10) / 10,
    clientId: parsed.data.clientId ?? null,
  });
  return json(record, 201);
}
