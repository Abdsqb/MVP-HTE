// Shared data types for everything stored in /data.

export type Confidence = "high" | "medium" | "low";

/** Every extracted value remembers how sure the AI was and where it came from. */
export interface ProfileField<T = string> {
  value: T;
  confidence: Confidence;
  source: string;
}

export interface ClaimRecord {
  date: ProfileField;
  type: ProfileField;
  amountPaid: ProfileField;
  description: ProfileField;
}

export interface ClientProfile {
  id: string;
  createdAt: string;
  updatedAt: string;
  reviewed: boolean;
  sourceFileName: string;
  business: {
    legalName: ProfileField;
    dba: ProfileField;
    entityType: ProfileField;
    fein: ProfileField;
    yearsInBusiness: ProfileField;
    industry: ProfileField;
    description: ProfileField;
  };
  contact: {
    fullName: ProfileField;
    title: ProfileField;
    email: ProfileField;
    phone: ProfileField;
  };
  address: {
    street: ProfileField;
    city: ProfileField;
    state: ProfileField;
    zip: ProfileField;
  };
  operations: {
    fullTimeEmployees: ProfileField;
    partTimeEmployees: ProfileField;
    annualRevenue: ProfileField;
    annualPayroll: ProfileField;
    numberOfLocations: ProfileField;
  };
  coverage: {
    typesRequested: ProfileField<string[]>;
    desiredEffectiveDate: ProfileField;
    requestedLimits: ProfileField;
  };
  claimsHistory: ClaimRecord[];
}

/** One timed run of a portal form, recorded by the demo timer. */
export interface TimingRecord {
  id: string;
  timestamp: string;
  portal: string;
  mode: "manual" | "auto";
  seconds: number;
  clientId: string | null;
}

/** A learned portal form: which profile path goes into which form field. */
export interface FieldMapping {
  fieldKey: string;
  label: string;
  profilePath: string | null;
  confidence: Confidence;
  transform?: string;
  /** Checkboxes only: the canonical value that means "checked" (e.g. "general_liability"). */
  checkWhen?: string | null;
  /** Selects/radios only: canonical profile value -> the portal's option value. */
  valueMap?: Record<string, string>;
}

export interface PortalMapping {
  signature: string;
  hostname: string;
  pathname: string;
  fields: FieldMapping[];
  createdAt: string;
  lastUsedAt: string | null;
  timesUsed: number;
}

/** What the extension reports about one form control (radio groups are one entry). */
export interface FormFieldDescriptor {
  key: string;
  type: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

export type FillStatus = "filled" | "check" | "unmapped";

/** One value the extension should put into the page. */
export interface FillInstruction {
  key: string;
  /** string for inputs/selects/radios, boolean for checkboxes, null = leave alone. */
  value: string | boolean | null;
  status: FillStatus;
  confidence: Confidence | null;
  profilePath: string | null;
  note: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  clientId: string;
  clientName: string;
  portal: string;
  fieldsFilled: number;
  fieldsToCheck: number;
  fieldsUnmapped: number;
  source: "cached" | "ai";
  durationMs: number;
}
