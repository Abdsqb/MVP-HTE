// The only module the app uses for AI. Prompts and schemas live here; the
// provider (Claude or Gemini) is just a transport, picked by env:
//   AI_PROVIDER=gemini | anthropic  (if unset: gemini when only GEMINI_API_KEY is set)
// 1. extractProfile: questionnaire PDF -> canonical client profile.
// 2. mapPortalFields: a portal's form fields -> profile paths. This call never
//    sees client data, only the form's labels and options.
import { z } from "zod";
import { ExtractedProfileSchema, PROFILE_PATHS, TRANSFORMS, type ExtractedProfile } from "./profile-schema";
import { anthropicProvider } from "./providers/anthropic";
import { geminiProvider } from "./providers/gemini";
import type { Provider } from "./providers/types";
import type { FormFieldDescriptor } from "./types";

export { AIError } from "./providers/types";

function pickProvider(): Provider {
  const chosen = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (chosen === "gemini") return geminiProvider;
  if (chosen === "anthropic" || chosen === "claude") return anthropicProvider;
  return process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY ? geminiProvider : anthropicProvider;
}

export const ai = pickProvider();

// ---------- Extraction ----------

const EXTRACT_SYSTEM = `You extract commercial insurance submission data from client documents for an insurance agent.

Documents are often messy: handwritten notes, margin scribbles, corrections, letters instead of forms, ranges instead of numbers.

Rules:
- Fill every field in the schema using the exact formats its descriptions give. If something is not in the document, use an empty string with confidence "low" and source "Not found".
- confidence "high": stated plainly and unambiguously. "medium": inferred, converted, or slightly unclear (e.g. a start year turned into years in business, a handwritten value). "low": ambiguous, contradictory, a range, a guess, or a scribbled correction that conflicts with the typed value.
- When the document gives a range or two conflicting values, pick the most defensible single value, mark it "low", and name both values in source so the agent can decide.
- source must say where the value came from (section, label, or a short quote), so the agent can verify it quickly.
- Convert to the canonical formats: digits-only money, YYYY-MM-DD dates, two-letter states, canonical entity and coverage values.
- Never invent data. Names, numbers and dates must come from the document.`;

export async function extractProfile(pdf: Buffer, fileName: string): Promise<ExtractedProfile> {
  const today = new Date().toISOString().slice(0, 10);
  return ai.generate({
    schema: ExtractedProfileSchema,
    system: EXTRACT_SYSTEM,
    pdf: { data: pdf, name: fileName },
    text: `Today is ${today} (use it to turn start dates into years in business and relative dates into real dates). Extract the client profile from this document.`,
  });
}

// ---------- Portal mapping ----------

const transformNames = TRANSFORMS.map(([t]) => t) as [string, ...string[]];

const MappingSchema = z.object({
  fields: z.array(
    z.object({
      fieldKey: z.string(),
      profilePath: z.string().nullable().describe("One of the listed profile paths, or null if nothing fits."),
      transform: z.enum(transformNames),
      checkWhen: z
        .string()
        .nullable()
        .describe("Checkboxes only: the canonical value that means checked. Otherwise null."),
      valueMap: z
        .array(z.object({ from: z.string(), to: z.string() }))
        .describe("Selects/radios only: canonical value -> option value. Empty array otherwise."),
      confidence: z.enum(["high", "medium", "low"]),
    }),
  ),
});

export type LearnedField = z.infer<typeof MappingSchema>["fields"][number];

const MAP_SYSTEM = `You map the fields of an insurance carrier's web form onto a canonical client profile, so the form can be auto-filled for any client later.

You see only the form's structure (keys, labels, types, options), never client data.

Profile paths (use these exact strings; for repeating claim rows replace N with the row index that appears in the field key):
${PROFILE_PATHS.map(([p, d]) => `- ${p}: ${d}`).join("\n")}

Transforms (how the canonical value is formatted for the field):
${TRANSFORMS.map(([t, d]) => `- ${t}: ${d}`).join("\n")}

Rules:
- Return one entry for every field, in the same order, with fieldKey copied exactly.
- Pick the transform from the field's label, placeholder and type (e.g. placeholder MM/DD/YYYY -> date_mdy; a "$" amount box -> money_plain; a 2-letter state text box -> none; a state dropdown whose options are codes -> none).
- Selects and radio groups: valueMap must translate every canonical value that has a sensible option. Entity types: sole_proprietorship, partnership, llc, corporation, s_corporation, nonprofit, other. Coverage: general_liability, workers_comp, property, commercial_auto, bop, professional_liability, umbrella, cyber, other. For a single-choice coverage field use derived.primaryCoverage; if an option bundles several lines, also add a key of the canonical values sorted and comma-joined (e.g. "general_liability,property"). For limits use keys like "1000000/2000000". For yes/no use "yes"/"no". For claim counts use the count as digits.
- Checkboxes: profilePath is usually coverage.typesRequested with checkWhen set to the canonical value. Attestation, consent or signature boxes must be null - a human confirms those.
- A field asking for total employees with no full/part-time split -> derived.totalEmployees. A free-text loss description -> derived.claimsSummary.
- confidence: high when the meaning is unambiguous, medium when it is a reasonable reading, low when it is a guess. Use null profilePath rather than a bad guess.`;

export async function mapPortalFields(
  page: { hostname: string; pathname: string; title: string },
  fields: FormFieldDescriptor[],
): Promise<LearnedField[]> {
  const result = await ai.generate({
    schema: MappingSchema,
    system: MAP_SYSTEM,
    text: `Page: ${page.title} (${page.hostname}${page.pathname})\n\nForm fields:\n${JSON.stringify(fields, null, 1)}`,
  });
  return result.fields;
}
