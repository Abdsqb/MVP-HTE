// Upload a questionnaire PDF (multipart "file") or name a bundled sample ({ sample }),
// and get back a new, unreviewed client profile.
import { AIError, extractProfile } from "@/lib/ai";
import { errorJson, json, preflight } from "@/lib/cors";
import { readSample } from "@/lib/samples";
import { newId, saveProfile } from "@/lib/storage";
import type { ClientProfile } from "@/lib/types";

const MAX_BYTES = 20 * 1024 * 1024;

export const OPTIONS = preflight;

export async function POST(req: Request) {
  let pdf: Buffer;
  let fileName: string;

  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const file = (await req.formData()).get("file");
    if (!(file instanceof File)) return errorJson("Attach a PDF file.");
    if (file.size > MAX_BYTES) return errorJson("That PDF is over 20 MB.");
    pdf = Buffer.from(await file.arrayBuffer());
    fileName = file.name;
  } else {
    const body = await req.json().catch(() => null);
    const sample = typeof body?.sample === "string" ? await readSample(body.sample) : null;
    if (!sample) return errorJson("Unknown sample document.");
    pdf = sample;
    fileName = body.sample;
  }

  if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") return errorJson("That file is not a PDF.");

  let extracted;
  try {
    extracted = await extractProfile(pdf, fileName);
  } catch (err) {
    if (err instanceof AIError) return errorJson(err.message, 502);
    console.error("Extraction failed", err);
    return errorJson("Extraction failed unexpectedly. Check the server log.", 500);
  }

  const now = new Date().toISOString();
  const profile: ClientProfile = {
    id: newId("cl"),
    createdAt: now,
    updatedAt: now,
    reviewed: false,
    sourceFileName: fileName,
    ...extracted,
  };
  await saveProfile(profile);
  return json(profile, 201);
}
