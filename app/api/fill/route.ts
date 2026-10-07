// The extension's one call: "here are this page's fields, fill them for client X".
// Uses the saved mapping for this form if there is one (no AI), otherwise asks
// the AI to learn the form once and saves it to the portal library.
import { z } from "zod";
import { AIError, mapPortalFields } from "@/lib/ai";
import { errorJson, json, preflight } from "@/lib/cors";
import { pageSignature, planFill } from "@/lib/fill";
import { isValidProfilePath } from "@/lib/profile-schema";
import { addAudit, getMapping, getProfile, newId, saveMapping } from "@/lib/storage";
import type { PortalMapping } from "@/lib/types";

const FillInput = z.object({
  profileId: z.string().min(1),
  page: z.object({ hostname: z.string(), pathname: z.string(), title: z.string().default("") }),
  fields: z
    .array(
      z.object({
        key: z.string().min(1),
        type: z.string(),
        label: z.string(),
        placeholder: z.string().optional(),
        required: z.boolean().optional(),
        options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
      }),
    )
    .min(1)
    .max(400),
  /** Set when the extension could not add the claim rows it was asked for. */
  ignoreExtraRows: z.boolean().optional(),
});

export const OPTIONS = preflight;

export async function POST(req: Request) {
  const started = Date.now();
  const parsed = FillInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson("Invalid fill request.");
  const { profileId, page, fields, ignoreExtraRows } = parsed.data;

  const profile = await getProfile(profileId);
  if (!profile) return errorJson("Client not found.", 404);

  const signature = pageSignature(page.hostname, page.pathname, fields.map((f) => f.key));
  let mapping = await getMapping(signature);
  const source = mapping ? "cached" : "ai";

  if (!mapping) {
    let learned;
    try {
      learned = await mapPortalFields(page, fields);
    } catch (err) {
      if (err instanceof AIError) return errorJson(err.message, 502);
      console.error("Portal mapping failed", err);
      return errorJson("Could not learn this form. Check the server log.", 500);
    }
    const byKey = new Map(learned.map((l) => [l.fieldKey, l]));
    mapping = {
      signature,
      hostname: page.hostname,
      pathname: page.pathname,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      timesUsed: 0,
      fields: fields.map((f) => {
        const l = byKey.get(f.key);
        const profilePath = l?.profilePath && isValidProfilePath(l.profilePath) ? l.profilePath : null;
        return {
          fieldKey: f.key,
          label: f.label || f.placeholder || f.key,
          profilePath,
          confidence: l?.confidence ?? "low",
          transform: l?.transform ?? "none",
          checkWhen: l?.checkWhen ?? null,
          valueMap: Object.fromEntries((l?.valueMap ?? []).map((e) => [e.from, e.to])),
        };
      }),
    } satisfies PortalMapping;
  }

  const plan = planFill(mapping.fields, fields, profile);
  const extraRows = ignoreExtraRows ? null : plan.extraRows;
  const summary = {
    filled: plan.instructions.filter((i) => i.status === "filled" && i.value !== null).length,
    toCheck: plan.instructions.filter((i) => i.status === "check").length,
    unmapped: plan.instructions.filter((i) => i.status === "unmapped").length,
  };

  // When rows still need adding, the extension refills right after; log that fill instead.
  if (!extraRows) {
    mapping = { ...mapping, lastUsedAt: new Date().toISOString(), timesUsed: mapping.timesUsed + 1 };
    await addAudit({
      id: newId("au"),
      timestamp: new Date().toISOString(),
      clientId: profile.id,
      clientName: profile.business.legalName.value || profile.sourceFileName,
      portal: `${page.hostname}${page.pathname}`,
      fieldsFilled: summary.filled,
      fieldsToCheck: summary.toCheck,
      fieldsUnmapped: summary.unmapped,
      source,
      durationMs: Date.now() - started,
    });
  }
  await saveMapping(mapping);

  return json({
    source,
    signature,
    client: { id: profile.id, name: profile.business.legalName.value, reviewed: profile.reviewed },
    instructions: plan.instructions,
    extraRows,
    summary,
  });
}
