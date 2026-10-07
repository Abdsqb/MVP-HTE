"use client";

// Harborline Commercial: a dense, two-column "underwriter" style form.
// Uses fieldsets, radio buttons for entity type, checkboxes for coverage
// lines, a YYYY-MM-DD text date and a claims table with "Add claim" rows.
import { useState } from "react";
import { US_STATES } from "@/lib/us-states";
import { DemoBanner, TimerBadge } from "../_kit/DemoChrome";
import { QuoteResult } from "../_kit/QuoteResult";
import { useFormValues } from "../_kit/useFormValues";
import { usePortalTimer, type TimerMode } from "../_kit/usePortalTimer";

const ACCENT = "#f59e0b";
const inputClass =
  "w-full border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-sm text-stone-100 outline-none focus:border-amber-500";

const ENTITY_TYPES = [
  ["sole", "Sole proprietor"],
  ["ptnr", "Partnership"],
  ["llc", "LLC"],
  ["corp", "Corporation"],
  ["npo", "Non-profit"],
];

const COVERAGE_LINES = [
  ["cov_gl", "General liability"],
  ["cov_wc", "Workers' compensation"],
  ["cov_prop", "Property"],
  ["cov_auto", "Commercial auto"],
];

function Box({ legend, children, wide = false }: { legend: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <fieldset className={`border border-stone-800 bg-stone-900/40 px-4 pb-4 pt-2 ${wide ? "md:col-span-2" : ""}`}>
      <legend className="px-1 text-[11px] font-semibold uppercase tracking-widest text-amber-500">{legend}</legend>
      <div className="grid gap-3">{children}</div>
    </fieldset>
  );
}

function Row({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-3">
      <label htmlFor={htmlFor} className="text-xs text-stone-400">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function HarborlinePortal() {
  const form = useFormValues();
  const timer = usePortalTimer("carrier-c");
  const [claimRows, setClaimRows] = useState(1);
  const [result, setResult] = useState<{ seconds: number | null; mode: TimerMode } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(timer.stop());
  }

  function startOver() {
    form.reset();
    timer.reset();
    setClaimRows(1);
    setResult(null);
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200">
      <DemoBanner />
      <header className="border-b-2 border-amber-500 bg-stone-900">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
          <div className="flex h-8 items-end gap-0.5">
            <span className="h-3 w-1.5 bg-amber-500" />
            <span className="h-5 w-1.5 bg-amber-500" />
            <span className="h-8 w-1.5 bg-amber-500" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold uppercase tracking-tight text-white">Harborline</div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-amber-500/80">Commercial</div>
          </div>
          <div className="ml-auto font-mono text-xs text-stone-500">BROKER PORTAL v4.2 · SUBMISSION INTAKE</div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {result ? (
          <QuoteResult carrier="Harborline Commercial" prefix="HLC" accent={ACCENT} {...result} onReset={startOver} />
        ) : (
          <form onSubmit={handleSubmit} onFocus={timer.start}>
            <div className="mb-6 flex items-baseline justify-between">
              <h1 className="text-xl font-semibold text-white">New Submission</h1>
              <span className="font-mono text-xs text-stone-500">Form HC-101 (rev. 03)</span>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Box legend="Named insured">
                <Row label="Business name" htmlFor="hl-biz-name">
                  <input {...form.field("biz_nm", "hl-biz-name")} required className={inputClass} />
                </Row>
                <Row label="Trading as" htmlFor="hl-dba">
                  <input {...form.field("trd_as", "hl-dba")} className={inputClass} />
                </Row>
                <Row label="FEIN" htmlFor="hl_taxid">
                  <input {...form.field("hl_taxid")} className={inputClass} />
                </Row>
                <Row label="Years in operation" htmlFor="hl_yrs">
                  <input {...form.field("hl_yrs")} className={inputClass} />
                </Row>
                <Row label="Industry sector" htmlFor="hl_sector">
                  <input {...form.field("hl_sector")} className={inputClass} />
                </Row>
                <div>
                  <div className="mb-1.5 text-xs text-stone-400">Legal entity</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {ENTITY_TYPES.map(([value, label]) => (
                      <label key={value} className="flex items-center gap-1.5 text-sm">
                        <input {...form.radio("ent_type", value)} className="accent-amber-500" />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </Box>

              <Box legend="Premises">
                <Row label="Address" htmlFor="prem_ln1">
                  <input {...form.field("prem_ln1")} className={inputClass} />
                </Row>
                <Row label="Town / City" htmlFor="prem_town">
                  <input {...form.field("prem_town")} className={inputClass} />
                </Row>
                <Row label="State" htmlFor="prem_region">
                  <select {...form.field("prem_region")} className={inputClass}>
                    <option value="">—</option>
                    {US_STATES.map(([code]) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </Row>
                <Row label="Postal code" htmlFor="prem_post">
                  <input {...form.field("prem_post")} className={inputClass} />
                </Row>
              </Box>

              <Box legend="Contact person">
                <Row label="Full name" htmlFor="ctc_name">
                  <input {...form.field("ctc_name")} required className={inputClass} />
                </Row>
                <Row label="Position" htmlFor="ctc_pos">
                  <input {...form.field("ctc_pos")} className={inputClass} />
                </Row>
                <Row label="E-mail" htmlFor="ctc_email">
                  <input {...form.field("ctc_email")} type="email" className={inputClass} />
                </Row>
                <Row label="Telephone" htmlFor="ctc_tel">
                  <input {...form.field("ctc_tel")} type="tel" className={inputClass} />
                </Row>
              </Box>

              <Box legend="Exposure base">
                <Row label="Full-time staff" htmlFor="exp_ft">
                  <input {...form.field("exp_ft")} className={inputClass} />
                </Row>
                <Row label="Part-time staff" htmlFor="exp_pt">
                  <input {...form.field("exp_pt")} className={inputClass} />
                </Row>
                <Row label="Annual turnover ($)" htmlFor="exp_sales">
                  <input {...form.field("exp_sales")} className={inputClass} />
                </Row>
                <Row label="Annual wage roll ($)" htmlFor="exp_wages">
                  <input {...form.field("exp_wages")} className={inputClass} />
                </Row>
                <Row label="Premises count" htmlFor="exp_sites">
                  <input {...form.field("exp_sites")} className={inputClass} />
                </Row>
              </Box>

              <Box legend="Nature of operations" wide>
                <textarea
                  {...form.field("hl_ops")}
                  aria-label="Nature of operations"
                  rows={2}
                  className={inputClass}
                />
              </Box>

              <Box legend="Cover required" wide>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {COVERAGE_LINES.map(([name, label]) => (
                    <label key={name} className="flex items-center gap-2 text-sm">
                      <input {...form.checkbox(name)} className="accent-amber-500" />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Row label="Inception date" htmlFor="inc_dt">
                    <input {...form.field("inc_dt")} placeholder="YYYY-MM-DD" className={inputClass} />
                  </Row>
                  <Row label="Liability limit sought" htmlFor="lim_gl">
                    <input {...form.field("lim_gl")} className={inputClass} />
                  </Row>
                </div>
              </Box>

              <Box legend="Loss history (last 5 years)" wide>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-stone-400">
                      <th className="pb-1.5 pr-2 font-normal">Date of loss</th>
                      <th className="pb-1.5 pr-2 font-normal">Type</th>
                      <th className="pb-1.5 pr-2 font-normal">Amount paid ($)</th>
                      <th className="pb-1.5 font-normal">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: claimRows }, (_, i) => (
                      <tr key={i}>
                        <td className="pb-2 pr-2">
                          <input {...form.field(`clm_${i}_dt`)} aria-label={`Claim ${i + 1} date of loss`} className={inputClass} />
                        </td>
                        <td className="pb-2 pr-2">
                          <input {...form.field(`clm_${i}_typ`)} aria-label={`Claim ${i + 1} type`} className={inputClass} />
                        </td>
                        <td className="pb-2 pr-2">
                          <input {...form.field(`clm_${i}_amt`)} aria-label={`Claim ${i + 1} amount paid`} className={inputClass} />
                        </td>
                        <td className="pb-2">
                          <input {...form.field(`clm_${i}_dsc`)} aria-label={`Claim ${i + 1} details`} className={inputClass} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex gap-3">
                  <button
                    type="button"
                    id="add_claim_row"
                    onClick={() => setClaimRows(claimRows + 1)}
                    className="border border-amber-500/60 px-3 py-1 text-xs text-amber-400 hover:bg-amber-500/10"
                  >
                    + Add claim
                  </button>
                  {claimRows > 1 && (
                    <button
                      type="button"
                      onClick={() => setClaimRows(claimRows - 1)}
                      className="px-3 py-1 text-xs text-stone-500 hover:text-stone-300"
                    >
                      Remove last row
                    </button>
                  )}
                </div>
              </Box>
            </div>

            <div className="mt-6 flex items-center justify-end gap-4 border-t border-stone-800 pt-5">
              <span className="text-xs text-stone-500">Submission is reviewed by a Harborline underwriter.</span>
              <button type="submit" className="bg-amber-500 px-6 py-2 text-sm font-bold uppercase tracking-wide text-black hover:bg-amber-400">
                Submit for quote
              </button>
            </div>
          </form>
        )}
      </main>
      <TimerBadge status={timer.status} mode={timer.mode} elapsed={timer.elapsed} />
    </div>
  );
}
