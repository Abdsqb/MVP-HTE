// The canonical client profile: one shape and one set of value formats.
// Extraction writes these formats; the fill engine (lib/fill.ts) converts them
// to whatever each portal wants. Keeping them strict is what lets one learned
// portal mapping work for every client.
import { z } from "zod";

export const ENTITY_TYPES = [
  ["sole_proprietorship", "Sole proprietorship"],
  ["partnership", "Partnership"],
  ["llc", "LLC (incl. PLLC, single-member)"],
  ["corporation", "Corporation (C-corp, Inc.)"],
  ["s_corporation", "S corporation"],
  ["nonprofit", "Non-profit"],
  ["other", "Other"],
] as const;

export const COVERAGE_TYPES = [
  ["general_liability", "General liability"],
  ["workers_comp", "Workers' compensation"],
  ["property", "Commercial property"],
  ["commercial_auto", "Commercial auto"],
  ["bop", "Business owners policy (BOP)"],
  ["professional_liability", "Professional liability"],
  ["umbrella", "Umbrella / excess"],
  ["cyber", "Cyber"],
  ["other", "Other"],
] as const;

const entityValues = ENTITY_TYPES.map(([v]) => v) as [string, ...string[]];
const coverageValues = COVERAGE_TYPES.map(([v]) => v) as [
  (typeof COVERAGE_TYPES)[number][0],
  ...(typeof COVERAGE_TYPES)[number][0][],
];

const confidence = z.enum(["high", "medium", "low"]);
const source = z
  .string()
  .describe('Short quote or location in the document, e.g. "Section C: Part-time employees". "Not found" if absent.');

function field(format: string) {
  return z.object({ value: z.string().describe(format), confidence, source });
}

function enumField(values: [string, ...string[]], format: string) {
  return z.object({ value: z.enum([...values, ""]).describe(format), confidence, source });
}

const text = field("Plain text as written, tidied. Empty string if not found.");
const integer = field('Whole number as digits only, e.g. "14". Empty string if not found.');
const money = field('US dollars as digits only, no symbols or commas, e.g. "640000". Empty string if not found.');
const isoDate = field('Date as YYYY-MM-DD. Empty string if not found.');

export const ExtractedProfileSchema = z.object({
  business: z.object({
    legalName: text,
    dba: text,
    entityType: enumField(entityValues, "Canonical entity type. PLLC counts as llc; C-corp / Inc. as corporation."),
    fein: field('Federal EIN formatted XX-XXXXXXX. Empty string if not found.'),
    yearsInBusiness: integer,
    industry: text,
    description: field("One or two sentence description of operations."),
  }),
  contact: z.object({
    fullName: field("Person's full name including any honorific as written, e.g. \"Dr. Jane Smith\"."),
    title: text,
    email: text,
    phone: field('US phone formatted (555) 555-5555. Empty string if not found.'),
  }),
  address: z.object({
    street: field("Street line including suite/unit."),
    city: text,
    state: field('Two-letter USPS state code, e.g. "OR".'),
    zip: field('5-digit ZIP code.'),
  }),
  operations: z.object({
    fullTimeEmployees: integer,
    partTimeEmployees: integer,
    annualRevenue: money,
    annualPayroll: money,
    numberOfLocations: integer,
  }),
  coverage: z.object({
    typesRequested: z.object({
      value: z.array(z.enum(coverageValues)).describe("Every coverage line the client wants quoted."),
      confidence,
      source,
    }),
    desiredEffectiveDate: isoDate,
    requestedLimits: field(
      'Per-occurrence/aggregate limits as digits joined by "/", e.g. "1000000/2000000". Single limit: just digits.',
    ),
  }),
  claimsHistory: z
    .array(
      z.object({
        date: isoDate,
        type: enumField(coverageValues, "Coverage line the claim was paid under."),
        amountPaid: money,
        description: text,
      }),
    )
    .describe("Every claim or loss in the document. Empty array if the document says there were none."),
});

export type ExtractedProfile = z.infer<typeof ExtractedProfileSchema>;

/** Every path the portal mapper may point a form field at. */
export const PROFILE_PATHS: [path: string, description: string][] = [
  ["business.legalName", "Legal business name"],
  ["business.dba", "DBA / trade name"],
  ["business.entityType", `Entity type, one of: ${entityValues.join(", ")}`],
  ["business.fein", "FEIN, XX-XXXXXXX"],
  ["business.yearsInBusiness", "Years in business, integer"],
  ["business.industry", "Industry / class of business, short text"],
  ["business.description", "Description / nature of operations"],
  ["contact.fullName", "Contact full name"],
  ["contact.title", "Contact title / role"],
  ["contact.email", "Contact email"],
  ["contact.phone", "Contact phone, (555) 555-5555"],
  ["address.street", "Street address"],
  ["address.city", "City"],
  ["address.state", "State, 2-letter code"],
  ["address.zip", "ZIP code"],
  ["operations.fullTimeEmployees", "Full-time employees, integer"],
  ["operations.partTimeEmployees", "Part-time employees, integer"],
  ["operations.annualRevenue", "Annual revenue / sales / turnover, digits"],
  ["operations.annualPayroll", "Annual payroll / wages, digits"],
  ["operations.numberOfLocations", "Number of locations / sites / premises, integer"],
  ["coverage.typesRequested", `Array of coverage lines from: ${coverageValues.join(", ")}`],
  ["coverage.desiredEffectiveDate", "Desired effective / inception date, YYYY-MM-DD"],
  ["coverage.requestedLimits", 'Limits as "1000000/2000000"'],
  ["derived.firstName", "Contact first name (honorific removed)"],
  ["derived.lastName", "Contact last name"],
  ["derived.totalEmployees", "Full-time + part-time employees, integer"],
  ["derived.primaryCoverage", "The single main coverage line (first requested) - for single-choice coverage fields"],
  ["derived.hasClaims", '"yes" or "no": any claims in the last 5 years'],
  ["derived.claimsCount", "Number of claims, integer"],
  ["derived.claimsSummary", "All claims as one readable paragraph (date, type, amount paid, details)"],
  ["claimsHistory[N].date", "Claim N date, YYYY-MM-DD (N = 0-based row index)"],
  ["claimsHistory[N].type", "Claim N coverage line"],
  ["claimsHistory[N].amountPaid", "Claim N amount paid, digits"],
  ["claimsHistory[N].description", "Claim N details"],
];

export const TRANSFORMS = [
  ["none", "Use the canonical value as-is"],
  ["date_mdy", "Date as MM/DD/YYYY"],
  ["date_iso", "Date as YYYY-MM-DD (also right for <input type=date>)"],
  ["money_plain", "Digits only, e.g. 640000"],
  ["money_us", "Formatted dollars, e.g. $640,000"],
  ["state_name", "Full state name instead of the 2-letter code"],
  ["limits_text", 'Limits as text, e.g. "$1,000,000 / $2,000,000"'],
  ["limits_per_occurrence", 'Only the per-occurrence limit, e.g. "$1,000,000"'],
  ["phone_digits", "Phone as 10 digits"],
] as const;

export type TransformName = (typeof TRANSFORMS)[number][0];

/** Accepts both concrete claim paths ("claimsHistory[2].date") and the plain ones above. */
export function isValidProfilePath(path: string): boolean {
  const generic = path.replace(/^claimsHistory\[\d+\]/, "claimsHistory[N]");
  return PROFILE_PATHS.some(([p]) => p === generic);
}
