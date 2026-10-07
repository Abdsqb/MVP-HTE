"use client";

// Review screen for one extracted client profile. Uncertain values are
// highlighted with the place in the document they came from; the agent edits
// or confirms them, then marks the profile reviewed.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { COVERAGE_TYPES, ENTITY_TYPES } from "@/lib/profile-schema";
import type { ClaimRecord, ClientProfile, Confidence, ProfileField } from "@/lib/types";
import { US_STATES } from "@/lib/us-states";
import { Badge, Card } from "./ui";

type Kind = "text" | "textarea" | "entity" | "state" | "date" | "money" | "int" | "email" | "tel" | "coverageLine";
type SectionKey = "business" | "contact" | "address" | "operations";

const SECTIONS: { key: SectionKey; title: string; fields: [key: string, label: string, kind: Kind][] }[] = [
  {
    key: "business",
    title: "Business",
    fields: [
      ["legalName", "Legal name", "text"],
      ["dba", "DBA / trade name", "text"],
      ["entityType", "Entity type", "entity"],
      ["fein", "FEIN", "text"],
      ["yearsInBusiness", "Years in business", "int"],
      ["industry", "Industry", "text"],
      ["description", "Operations", "textarea"],
    ],
  },
  {
    key: "contact",
    title: "Primary contact",
    fields: [
      ["fullName", "Full name", "text"],
      ["title", "Title", "text"],
      ["email", "Email", "email"],
      ["phone", "Phone", "tel"],
    ],
  },
  {
    key: "address",
    title: "Address",
    fields: [
      ["street", "Street", "text"],
      ["city", "City", "text"],
      ["state", "State", "state"],
      ["zip", "ZIP", "text"],
    ],
  },
  {
    key: "operations",
    title: "Operations & exposure",
    fields: [
      ["fullTimeEmployees", "Full-time employees", "int"],
      ["partTimeEmployees", "Part-time employees", "int"],
      ["annualRevenue", "Annual revenue", "money"],
      ["annualPayroll", "Annual payroll", "money"],
      ["numberOfLocations", "Locations", "int"],
    ],
  },
];

const TONE: Record<Confidence, "green" | "yellow" | "red"> = { high: "green", medium: "yellow", low: "red" };
const ROW_TINT: Record<Confidence, string> = {
  high: "border-transparent",
  medium: "border-yellow-500/50 bg-yellow-500/[0.04]",
  low: "border-red-500/50 bg-red-500/[0.05]",
};

const inputClass =
  "w-full rounded-md border border-line bg-bg px-3 py-1.5 text-sm outline-none focus:border-accent";

const edited = (value: string): ProfileField => ({ value, confidence: "high", source: "Edited by agent" });
const confirmed = <T,>(f: ProfileField<T>): ProfileField<T> => ({
  ...f,
  confidence: "high",
  source: f.source.startsWith("Confirmed") ? f.source : `Confirmed by agent · ${f.source}`,
});

function money(value: string) {
  const n = Number(value);
  return value && Number.isFinite(n) ? `$${n.toLocaleString("en-US")}` : "";
}

function ValueInput({ kind, value, onChange, label }: { kind: Kind; value: string; onChange: (v: string) => void; label: string }) {
  const common = { "aria-label": label, value, className: inputClass };
  switch (kind) {
    case "textarea":
      return <textarea {...common} rows={3} onChange={(e) => onChange(e.target.value)} />;
    case "entity":
    case "coverageLine":
      return (
        <select {...common} onChange={(e) => onChange(e.target.value)}>
          <option value="">-</option>
          {(kind === "entity" ? ENTITY_TYPES : COVERAGE_TYPES).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      );
    case "state":
      return (
        <select {...common} onChange={(e) => onChange(e.target.value)}>
          <option value="">-</option>
          {US_STATES.map(([code, name]) => (
            <option key={code} value={code}>
              {code} · {name}
            </option>
          ))}
        </select>
      );
    case "date":
      return <input {...common} type="date" onChange={(e) => onChange(e.target.value)} />;
    case "money":
    case "int":
      return <input {...common} inputMode="numeric" onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))} />;
    default:
      return <input {...common} type={kind === "email" ? "email" : kind === "tel" ? "tel" : "text"} onChange={(e) => onChange(e.target.value)} />;
  }
}

function FieldRow({
  label,
  kind,
  field,
  onChange,
}: {
  label: string;
  kind: Kind;
  field: ProfileField;
  onChange: (f: ProfileField) => void;
}) {
  return (
    <div className={`grid gap-x-4 gap-y-1 rounded-lg border-l-2 py-2 pl-3 pr-2 md:grid-cols-[170px_1fr] ${ROW_TINT[field.confidence]}`}>
      <div className="pt-1.5 text-sm text-muted">{label}</div>
      <div>
        <ValueInput kind={kind} label={label} value={field.value} onChange={(v) => onChange(edited(v))} />
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <Badge tone={TONE[field.confidence]}>{field.confidence}</Badge>
          {kind === "money" && field.value && <span className="text-zinc-300">{money(field.value)}</span>}
          <span className="text-muted">{field.source}</span>
          {field.confidence !== "high" && (
            <button onClick={() => onChange(confirmed(field))} className="ml-auto text-indigo-300 hover:text-indigo-200">
              Looks right ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function allFields(p: ClientProfile): ProfileField<unknown>[] {
  return [
    ...Object.values(p.business),
    ...Object.values(p.contact),
    ...Object.values(p.address),
    ...Object.values(p.operations),
    ...Object.values(p.coverage),
    ...p.claimsHistory.flatMap((c) => Object.values(c)),
  ];
}

const emptyClaim = (): ClaimRecord => ({
  date: edited(""),
  type: edited(""),
  amountPaid: edited(""),
  description: edited(""),
});

export default function ProfileEditor({ initial }: { initial: ClientProfile }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toCheck = useMemo(() => allFields(draft).filter((f) => f.confidence !== "high").length, [draft]);

  function update(next: (d: ClientProfile) => ClientProfile) {
    setDraft(next);
    setDirty(true);
  }

  function setField(section: SectionKey, key: string, field: ProfileField) {
    update((d) => ({ ...d, [section]: { ...d[section], [key]: field } }) as ClientProfile);
  }

  function setClaim(index: number, key: keyof ClaimRecord, field: ProfileField) {
    update((d) => ({
      ...d,
      claimsHistory: d.claimsHistory.map((c, i) => (i === index ? { ...c, [key]: field } : c)),
    }));
  }

  async function save(reviewed: boolean) {
    setSaving(true);
    setError(null);
    try {
      const { business, contact, address, operations, coverage, claimsHistory } = draft;
      const res = await fetch(`/api/profiles/${draft.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business, contact, address, operations, coverage, claimsHistory, reviewed }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not save.");
      setDraft(body);
      setDirty(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete ${draft.business.legalName.value || "this client"}? This cannot be undone.`)) return;
    await fetch(`/api/profiles/${draft.id}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  const { coverage } = draft;

  return (
    <>
      <div className="sticky top-14 z-[5] -mx-6 mb-8 border-b border-line bg-bg/90 px-6 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0">
            <Link href="/" className="text-xs text-muted hover:text-white">
              ← Dashboard
            </Link>
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {draft.business.legalName.value || "Unnamed client"}
            </h1>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
              <span className="font-mono">{draft.sourceFileName}</span>
              <span>·</span>
              {draft.reviewed ? <Badge tone="green">reviewed</Badge> : <Badge tone="yellow">needs review</Badge>}
              <span>·</span>
              <span>{toCheck === 0 ? "nothing to check" : `${toCheck} field${toCheck === 1 ? "" : "s"} to check`}</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={remove} className="rounded-lg px-3 py-2 text-sm text-muted hover:text-red-300">
              Delete
            </button>
            <button
              onClick={() => save(draft.reviewed)}
              disabled={saving || !dirty}
              className="rounded-lg border border-line px-4 py-2 text-sm hover:border-zinc-500 disabled:opacity-40"
            >
              {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving || (draft.reviewed && !dirty)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-40"
            >
              {draft.reviewed && !dirty ? "Reviewed ✓" : "Mark reviewed"}
            </button>
          </div>
        </div>
        {error && <div className="mt-3 text-sm text-red-300">{error}</div>}
        {!draft.reviewed && toCheck > 0 && (
          <p className="mt-3 text-xs text-muted">
            Yellow and red rows were inferred or ambiguous in the document. Correct them or click &quot;Looks right&quot;, then
            mark the profile reviewed.
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {SECTIONS.map((section) => (
          <Card key={section.key} title={section.title}>
            <div className="space-y-1">
              {section.fields.map(([key, label, kind]) => (
                <FieldRow
                  key={key}
                  label={label}
                  kind={kind}
                  field={(draft[section.key] as unknown as Record<string, ProfileField>)[key]}
                  onChange={(f) => setField(section.key, key, f)}
                />
              ))}
            </div>
          </Card>
        ))}

        <Card title="Coverage requested" className="lg:col-span-2">
          <div className={`mb-2 rounded-lg border-l-2 py-2 pl-3 pr-2 ${ROW_TINT[coverage.typesRequested.confidence]}`}>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {COVERAGE_TYPES.map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="accent-indigo-500"
                    checked={coverage.typesRequested.value.includes(value)}
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        coverage: {
                          ...d.coverage,
                          typesRequested: {
                            value: e.target.checked
                              ? [...d.coverage.typesRequested.value, value]
                              : d.coverage.typesRequested.value.filter((v) => v !== value),
                            confidence: "high",
                            source: "Edited by agent",
                          },
                        },
                      }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <Badge tone={TONE[coverage.typesRequested.confidence]}>{coverage.typesRequested.confidence}</Badge>
              <span className="text-muted">{coverage.typesRequested.source}</span>
              {coverage.typesRequested.confidence !== "high" && (
                <button
                  onClick={() => update((d) => ({ ...d, coverage: { ...d.coverage, typesRequested: confirmed(d.coverage.typesRequested) } }))}
                  className="ml-auto text-indigo-300 hover:text-indigo-200"
                >
                  Looks right ✓
                </button>
              )}
            </div>
          </div>
          <div className="grid gap-1 lg:grid-cols-2">
            <FieldRow
              label="Effective date"
              kind="date"
              field={coverage.desiredEffectiveDate}
              onChange={(f) => update((d) => ({ ...d, coverage: { ...d.coverage, desiredEffectiveDate: f } }))}
            />
            <FieldRow
              label="Limits (occ / agg)"
              kind="text"
              field={coverage.requestedLimits}
              onChange={(f) => update((d) => ({ ...d, coverage: { ...d.coverage, requestedLimits: f } }))}
            />
          </div>
        </Card>

        <Card title="Loss history (last 5 years)" className="lg:col-span-2">
          {draft.claimsHistory.length === 0 && <p className="mb-3 text-sm text-muted">No claims on file.</p>}
          <div className="space-y-4">
            {draft.claimsHistory.map((claim, i) => (
              <div key={i} className="rounded-lg border border-line p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-muted">
                  <span>Claim {i + 1}</span>
                  <button
                    onClick={() => update((d) => ({ ...d, claimsHistory: d.claimsHistory.filter((_, j) => j !== i) }))}
                    className="hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-1 lg:grid-cols-2">
                  <FieldRow label="Date of loss" kind="date" field={claim.date} onChange={(f) => setClaim(i, "date", f)} />
                  <FieldRow label="Line" kind="coverageLine" field={claim.type} onChange={(f) => setClaim(i, "type", f)} />
                  <FieldRow label="Amount paid" kind="money" field={claim.amountPaid} onChange={(f) => setClaim(i, "amountPaid", f)} />
                  <FieldRow label="Details" kind="text" field={claim.description} onChange={(f) => setClaim(i, "description", f)} />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => update((d) => ({ ...d, claimsHistory: [...d.claimsHistory, emptyClaim()] }))}
            className="mt-4 rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-white"
          >
            + Add claim
          </button>
        </Card>
      </div>
    </>
  );
}
