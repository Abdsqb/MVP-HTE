"use client";

// Bluecrest Insurance: a modern three-step wizard.
// Different vocabulary ("Insured Entity", "Total Wages", "Headcount"),
// some fields have only placeholders, the contact name is split into
// first/last, state is a 2-letter text box and the date is a date picker.
import { useState } from "react";
import { DemoBanner, TimerBadge } from "../_kit/DemoChrome";
import { QuoteResult } from "../_kit/QuoteResult";
import { useFormValues } from "../_kit/useFormValues";
import { usePortalTimer, type TimerMode } from "../_kit/usePortalTimer";

const ACCENT = "#a78bfa";
const STEPS = ["Your business", "Operations", "Coverage & contact"];
const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-violet-200/40 outline-none focus:border-violet-400 focus:bg-white/10";

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-violet-200/70">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function BluecrestPortal() {
  const form = useFormValues();
  const timer = usePortalTimer("carrier-b");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<{ seconds: number | null; mode: TimerMode } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // On steps 1-2, "Next" (or Enter) moves forward instead of submitting.
    if (step < STEPS.length - 1) return setStep(step + 1);
    setResult(timer.stop());
  }

  function startOver() {
    form.reset();
    timer.reset();
    setStep(0);
    setResult(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#120d24] to-[#07060d] text-white">
      <DemoBanner />
      <header className="mx-auto flex max-w-2xl items-center gap-2 px-6 py-6">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-600" />
        <span className="text-xl font-bold tracking-tight">
          blue<span className="text-violet-300">crest</span>
        </span>
        <span className="ml-auto rounded-full border border-white/10 px-3 py-1 text-xs text-violet-200/70">
          Small business quotes in minutes
        </span>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-16">
        {result ? (
          <QuoteResult carrier="Bluecrest Insurance" prefix="BCI" accent={ACCENT} {...result} onReset={startOver} />
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl shadow-violet-950/50">
            {/* Stepper */}
            <ol className="mb-8 flex items-center gap-2">
              {STEPS.map((name, i) => (
                <li key={name} className="flex flex-1 items-center gap-2">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                      i <= step ? "bg-violet-400 text-black" : "bg-white/10 text-violet-200/50"
                    }`}
                  >
                    {i < step ? "✓" : i + 1}
                  </span>
                  <span className={`text-xs ${i === step ? "text-white" : "text-violet-200/50"}`}>{name}</span>
                  {i < STEPS.length - 1 && <span className="h-px flex-1 bg-white/10" />}
                </li>
              ))}
            </ol>

            <form onSubmit={handleSubmit} onFocus={timer.start} className="space-y-4">
              {step === 0 && (
                <>
                  <h1 className="text-2xl font-semibold">Tell us about the insured</h1>
                  <Field label="Insured Entity" htmlFor="insd_nm">
                    <input {...form.field("insd_nm")} required className={inputClass} />
                  </Field>
                  <input {...form.field("insd_dba")} placeholder="Doing business as (optional)" className={inputClass} />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Organization Type" htmlFor="org_typ">
                      <select {...form.field("org_typ")} className={inputClass}>
                        <option value="">Choose…</option>
                        <option value="IND">Individual</option>
                        <option value="PART">Partnership</option>
                        <option value="LLC">Limited Liability Co.</option>
                        <option value="CORP">Corporation</option>
                        <option value="NFP">Not-for-Profit</option>
                      </select>
                    </Field>
                    <Field label="Tax ID (EIN)" htmlFor="tin">
                      <input {...form.field("tin")} className={inputClass} />
                    </Field>
                  </div>
                  <p className="pt-2 text-sm font-medium text-violet-200/80">Risk location</p>
                  <input {...form.field("risk_addr")} placeholder="Street address" className={inputClass} />
                  <div className="grid grid-cols-3 gap-4">
                    <input {...form.field("risk_city")} placeholder="City" className={inputClass} />
                    <input {...form.field("st_cd")} placeholder="State (2-letter)" maxLength={2} className={inputClass} />
                    <input {...form.field("postal")} placeholder="ZIP" className={inputClass} />
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <h1 className="text-2xl font-semibold">How does the business operate?</h1>
                  <input
                    {...form.field("naics_txt")}
                    placeholder="What does the business do? (e.g. Restaurant)"
                    className={inputClass}
                  />
                  <Field label="Operations narrative" htmlFor="ops_narr">
                    <textarea {...form.field("ops_narr")} rows={3} className={inputClass} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Years Operating" htmlFor="yrs_op">
                      <input {...form.field("yrs_op")} type="number" min={0} className={inputClass} />
                    </Field>
                    <Field label="Number of Sites" htmlFor="loc_qty">
                      <input {...form.field("loc_qty")} type="number" min={1} className={inputClass} />
                    </Field>
                    <Field label="Headcount (Full-Time)" htmlFor="hc_ft">
                      <input {...form.field("hc_ft")} type="number" min={0} className={inputClass} />
                    </Field>
                    <Field label="Headcount (Part-Time)" htmlFor="hc_pt">
                      <input {...form.field("hc_pt")} type="number" min={0} className={inputClass} />
                    </Field>
                    <Field label="Total Wages" htmlFor="payroll_ttl">
                      <input {...form.field("payroll_ttl")} placeholder="$" className={inputClass} />
                    </Field>
                    <Field label="Gross Sales" htmlFor="rev_gross">
                      <input {...form.field("rev_gross")} placeholder="$" className={inputClass} />
                    </Field>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h1 className="text-2xl font-semibold">Coverage and who to contact</h1>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Coverage Needed" htmlFor="cov_line">
                      <select {...form.field("cov_line")} className={inputClass}>
                        <option value="">Choose…</option>
                        <option value="gl">General Liability</option>
                        <option value="wc">Workers&apos; Comp</option>
                        <option value="prop">Property</option>
                        <option value="auto">Business Auto</option>
                        <option value="pkg">Package (GL + Property)</option>
                      </select>
                    </Field>
                    <Field label="Policy Start Date" htmlFor="eff_dt">
                      <input {...form.field("eff_dt")} type="date" className={inputClass} />
                    </Field>
                    <Field label="Liability Limits" htmlFor="lim_opt">
                      <select {...form.field("lim_opt")} className={inputClass}>
                        <option value="">Choose…</option>
                        <option value="500k_1m">$500K / $1M</option>
                        <option value="1m_2m">$1M / $2M</option>
                        <option value="2m_4m">$2M / $4M</option>
                        <option value="other">Other</option>
                      </select>
                    </Field>
                    <Field label="Claims in last 5 years" htmlFor="clm_5yr">
                      <select {...form.field("clm_5yr")} className={inputClass}>
                        <option value="">Choose…</option>
                        <option value="0">None</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3+">3 or more</option>
                      </select>
                    </Field>
                  </div>
                  <p className="pt-2 text-sm font-medium text-violet-200/80">Primary contact</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="First Name" htmlFor="pc_fn">
                      <input {...form.field("pc_fn")} required className={inputClass} />
                    </Field>
                    <Field label="Last Name" htmlFor="pc_ln">
                      <input {...form.field("pc_ln")} required className={inputClass} />
                    </Field>
                  </div>
                  <input {...form.field("pc_role")} placeholder="Role / Title" className={inputClass} />
                  <div className="grid grid-cols-2 gap-4">
                    <input {...form.field("pc_mail")} type="email" placeholder="Email" className={inputClass} />
                    <input {...form.field("pc_tel")} type="tel" placeholder="Phone" className={inputClass} />
                  </div>
                </>
              )}

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  disabled={step === 0}
                  className="rounded-full px-5 py-2.5 text-sm text-violet-200/70 hover:text-white disabled:invisible"
                >
                  ← Back
                </button>
                {step < STEPS.length - 1 ? (
                  // A submit button so the browser checks this step's required fields first.
                  <button
                    type="submit"
                    className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black hover:bg-violet-100"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="rounded-full bg-violet-400 px-6 py-2.5 text-sm font-semibold text-black hover:bg-violet-300"
                  >
                    Get my quote
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </main>
      <TimerBadge status={timer.status} mode={timer.mode} elapsed={timer.elapsed} />
    </div>
  );
}
