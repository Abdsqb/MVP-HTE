import { z } from "zod";
import { errorJson, json, preflight } from "@/lib/cors";
import { ExtractedProfileSchema } from "@/lib/profile-schema";
import { deleteProfile, getProfile, saveProfile } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

const ProfileUpdate = ExtractedProfileSchema.extend({ reviewed: z.boolean() });

export const OPTIONS = preflight;

export async function GET(_req: Request, { params }: Ctx) {
  const profile = await getProfile((await params).id);
  return profile ? json(profile) : errorJson("Client not found.", 404);
}

export async function PUT(req: Request, { params }: Ctx) {
  const existing = await getProfile((await params).id);
  if (!existing) return errorJson("Client not found.", 404);
  const parsed = ProfileUpdate.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson("Invalid profile: " + parsed.error.issues[0]?.path.join("."));

  const profile = await saveProfile({
    ...existing,
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  });
  return json(profile);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  await deleteProfile((await params).id);
  return json({ ok: true });
}
