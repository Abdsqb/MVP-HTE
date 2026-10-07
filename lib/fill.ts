// The fill engine: learned mapping + client profile -> the exact values a portal wants.
// Pure functions, no AI. Everything portal-specific lives in the mapping
// (profile path, transform, option map); everything client-specific in the profile.
import { createHash } from "crypto";
import { COVERAGE_TYPES, ENTITY_TYPES } from "./profile-schema";
import { US_STATES } from "./us-states";
import type {
  ClaimRecord,
  ClientProfile,
  Confidence,
  FieldMapping,
  FillInstruction,
  FormFieldDescriptor,
} from "./types";

const RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };
const minConfidence = (...all: Confidence[]) => all.reduce((a, b) => (RANK[a] <= RANK[b] ? a : b));

/**
 * Identifies "this form" across visits. Digits are ignored so a claims table
 * with 1 row and the same table with 3 rows share one learned mapping.
 */
export function pageSignature(hostname: string, pathname: string, keys: string[]): string {
  const shape = [...new Set(keys.map((k) => k.replace(/\d+/g, "#")))].sort().join(",");
  return createHash("sha1").update(`${hostname}${pathname}|${shape}`).digest("hex").slice(0, 16);
}

// ---------- Reading values out of the profile ----------

type Resolved = { value: string | string[]; confidence: Confidence; source: string };

const HONORIFICS = /^(dr|mr|mrs|ms|mx|miss|prof)\.?$/i;

function nameParts(profile: ClientProfile) {
  const parts = profile.contact.fullName.value.trim().split(/\s+/).filter(Boolean);
  while (parts.length > 1 && HONORIFICS.test(parts[0])) parts.shift();
  return parts;
}

function claimsConfidence(claims: ClaimRecord[]): Confidence {
  // "No claims" can also mean "the document never said", so it's worth a glance.
  if (claims.length === 0) return "medium";
  return minConfidence(...claims.flatMap((c) => [c.date.confidence, c.amountPaid.confidence]));
}

function derived(profile: ClientProfile, name: string): Resolved | null {
  const { contact, operations, coverage, claimsHistory: claims } = profile;
  switch (name) {
    case "firstName":
    case "lastName": {
      const parts = nameParts(profile);
      if (parts.length === 0) return null;
      const value = name === "firstName" ? parts[0] : parts.slice(1).join(" ");
      // Three-part names are a guess at where first ends and last begins.
      const confidence = parts.length > 2 ? minConfidence(contact.fullName.confidence, "medium") : contact.fullName.confidence;
      return { value, confidence, source: `Split from "${contact.fullName.value}"` };
    }
    case "totalEmployees": {
      const ft = operations.fullTimeEmployees;
      const pt = operations.partTimeEmployees;
      const n = (Number(ft.value) || 0) + (Number(pt.value) || 0);
      if (!ft.value && !pt.value) return null;
      return {
        value: String(n),
        confidence: minConfidence(ft.confidence, pt.confidence),
        source: `Full-time ${ft.value || "?"} + part-time ${pt.value || "?"}`,
      };
    }
    case "primaryCoverage":
      // Kept as the full list: option matching tries the combination first
      // (a "package" option), then each line in order, so the first line wins.
      return coverage.typesRequested.value.length ? coverage.typesRequested : null;
    case "hasClaims":
      return {
        value: claims.length > 0 ? "yes" : "no",
        confidence: claimsConfidence(claims),
        source: claims.length > 0 ? `${claims.length} claim(s) in loss history` : "No claims in profile",
      };
    case "claimsCount":
      return { value: String(claims.length), confidence: claimsConfidence(claims), source: "Loss history" };
    case "claimsSummary":
      return {
        value:
          claims.length === 0
            ? "None"
            : claims
                .map(
                  (c) =>
                    `${formatDate(c.date.value, "mdy")} - ${humanize(c.type.value)} - ${formatMoney(c.amountPaid.value)} paid. ${c.description.value}`,
                )
                .join("\n"),
        confidence: claimsConfidence(claims),
        source: "Loss history",
      };
  }
  return null;
}

function readPath(profile: ClientProfile, path: string): Resolved | null {
  const claim = path.match(/^claimsHistory\[(\d+)\]\.(date|type|amountPaid|description)$/);
  if (claim) return profile.claimsHistory[Number(claim[1])]?.[claim[2] as keyof ClaimRecord] ?? null;
  if (path.startsWith("derived.")) return derived(profile, path.slice("derived.".length));
  const [group, key] = path.split(".");
  const section = (profile as unknown as Record<string, Record<string, unknown>>)[group];
  const field = section?.[key];
  return field && typeof field === "object" && "value" in field ? (field as Resolved) : null;
}

// ---------- Formatting ----------

const digits = (s: string) => s.replace(/[^\d.]/g, "");

function formatMoney(value: string) {
  const n = Number(digits(value));
  return value && Number.isFinite(n) ? `$${n.toLocaleString("en-US")}` : value;
}

function formatDate(value: string, style: "mdy" | "iso") {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const mdy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const [y, m, d] = iso ? [iso[1], iso[2], iso[3]] : mdy ? [mdy[3], mdy[1].padStart(2, "0"), mdy[2].padStart(2, "0")] : [];
  if (!y) return value;
  return style === "mdy" ? `${m}/${d}/${y}` : `${y}-${m}-${d}`;
}

const LABELS: Record<string, string> = Object.fromEntries([...ENTITY_TYPES, ...COVERAGE_TYPES]);

/** Canonical codes like "workers_comp" read badly in a text box. */
function humanize(value: string) {
  return LABELS[value]?.replace(/ \(.*\)$/, "") ?? value;
}

function transform(value: string, name: string | undefined): string {
  switch (name) {
    case "date_mdy":
      return formatDate(value, "mdy");
    case "date_iso":
      return formatDate(value, "iso");
    case "money_plain":
      return digits(value);
    case "money_us":
      return formatMoney(value);
    case "state_name":
      return US_STATES.find(([code]) => code === value.toUpperCase())?.[1] ?? value;
    case "limits_text":
      return value.split("/").map(formatMoney).join(" / ");
    case "limits_per_occurrence":
      return formatMoney(value.split("/")[0]);
    case "phone_digits":
      return value.replace(/\D/g, "");
    default:
      return humanize(value);
  }
}

// ---------- Matching select / radio options ----------

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function pickOption(
  value: string | string[],
  mapping: FieldMapping,
  options: NonNullable<FormFieldDescriptor["options"]>,
): string | null {
  const exists = (v: string | undefined) => (v !== undefined && options.some((o) => o.value === v) ? v : null);
  // For multi-value answers try the whole combination first ("general_liability,property" -> "Package").
  const candidates = Array.isArray(value) ? [[...value].sort().join(","), ...value] : [value];

  for (const c of candidates) {
    const hit = exists(mapping.valueMap?.[c]);
    if (hit) return hit;
  }
  for (const c of candidates) {
    const targets = [norm(c), norm(humanize(c))];
    const stateName = US_STATES.find(([code]) => code === c.toUpperCase())?.[1];
    if (stateName) targets.push(norm(stateName));
    const direct = options.find((o) => o.value && (targets.includes(norm(o.value)) || targets.includes(norm(o.label))));
    if (direct) return direct.value;
    // "3+" style buckets for counts.
    if (/^\d+$/.test(c)) {
      const bucket = options.find((o) => {
        const m = (o.value + " " + o.label).match(/(\d+)\s*\+|(\d+)\s+or more/);
        const min = m ? Number(m[1] ?? m[2]) : NaN;
        return Number(c) >= min;
      });
      if (bucket) return bucket.value;
    }
  }
  return null;
}

// ---------- Building fill instructions ----------

/** Finds the learned field for a key, generalising claim rows (clm_0_dt learned -> clm_2_dt). */
export function findFieldMapping(fields: FieldMapping[], key: string): FieldMapping | null {
  const exact = fields.find((f) => f.fieldKey === key);
  if (exact) return exact;
  const shape = key.replace(/\d+/g, "#");
  const keyNums = key.match(/\d+/g) ?? [];
  for (const f of fields) {
    if (f.fieldKey.replace(/\d+/g, "#") !== shape) continue;
    const row = f.profilePath?.match(/^claimsHistory\[(\d+)\](.*)$/);
    if (!row) continue;
    const pos = (f.fieldKey.match(/\d+/g) ?? ([] as string[])).indexOf(row[1]);
    if (pos < 0 || keyNums[pos] === undefined) continue;
    return { ...f, fieldKey: key, profilePath: `claimsHistory[${keyNums[pos]}]${row[2]}` };
  }
  return null;
}

function instructionFor(field: FormFieldDescriptor, mapping: FieldMapping | null, profile: ClientProfile): FillInstruction {
  const base = { key: field.key, profilePath: mapping?.profilePath ?? null };
  if (!mapping?.profilePath) {
    return { ...base, value: null, status: "unmapped", confidence: null, note: "No matching client data for this field" };
  }

  const resolved = readPath(profile, mapping.profilePath);
  const isClaimRow = mapping.profilePath.startsWith("claimsHistory[");
  if (!resolved && isClaimRow) {
    // An extra empty claim row on the form: nothing to put there, nothing to check.
    return { ...base, value: null, status: "filled", confidence: "high", note: "No claim for this row" };
  }

  if (field.type === "checkbox") {
    if (!resolved) return { ...base, value: null, status: "check", confidence: "low", note: "No value in the client profile" };
    const want = mapping.checkWhen ?? "yes";
    const checked = Array.isArray(resolved.value) ? resolved.value.includes(want) : norm(resolved.value) === norm(want);
    const confidence = minConfidence(resolved.confidence, mapping.confidence);
    return { ...base, value: checked, status: confidence === "high" ? "filled" : "check", confidence, note: resolved.source };
  }

  const empty = !resolved || (Array.isArray(resolved.value) ? resolved.value.length === 0 : !resolved.value.trim());
  if (!resolved || empty) {
    return { ...base, value: null, status: "check", confidence: "low", note: "No value in the client profile, fill by hand" };
  }

  const confidence = minConfidence(resolved.confidence, mapping.confidence);
  const status = confidence === "high" ? "filled" : "check";

  if (field.options?.length) {
    const option = pickOption(resolved.value, mapping, field.options);
    if (option === null) {
      const shown = Array.isArray(resolved.value) ? resolved.value.join(", ") : resolved.value;
      return { ...base, value: null, status: "check", confidence: "low", note: `No option matches "${humanize(shown)}"` };
    }
    return { ...base, value: option, status, confidence, note: resolved.source };
  }

  let value = Array.isArray(resolved.value)
    ? resolved.value.map(humanize).join(", ")
    : transform(resolved.value, mapping.transform);
  if (field.type === "date") value = formatDate(value, "iso");
  if (field.type === "number") value = digits(value);
  return { ...base, value, status, confidence, note: resolved.source };
}

export interface FillPlan {
  instructions: FillInstruction[];
  /** The form needs this many more claim rows; the extension clicks "add" next to anchorKey. */
  extraRows: { count: number; anchorKey: string } | null;
}

export function planFill(fields: FieldMapping[], page: FormFieldDescriptor[], profile: ClientProfile): FillPlan {
  const mapped = page.map((f) => ({ field: f, mapping: findFieldMapping(fields, f.key) }));
  const instructions = mapped.map(({ field, mapping }) => instructionFor(field, mapping, profile));

  // Does the form have fewer claim rows than the client has claims?
  let maxRow = -1;
  let anchorKey = "";
  for (const { field, mapping } of mapped) {
    const row = mapping?.profilePath?.match(/^claimsHistory\[(\d+)\]/);
    if (row && Number(row[1]) > maxRow) {
      maxRow = Number(row[1]);
      anchorKey = field.key;
    }
  }
  const missing = profile.claimsHistory.length - (maxRow + 1);
  return { instructions, extraRows: maxRow >= 0 && missing > 0 ? { count: missing, anchorKey } : null };
}
