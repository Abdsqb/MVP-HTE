"use client";

// Northgate Mutual: a traditional carrier with one long single-page form.
// Labels sit above inputs, sections are numbered, state is a dropdown,
// and the effective date is a plain MM/DD/YYYY text box.
import { useState } from "react";
import { US_STATES } from "@/lib/us-states";
import { DemoBanner, TimerBadge } from "../_kit/DemoChrome";
import { QuoteResult } from "../_kit/QuoteResult";
import { useFormValues } from "../_kit/useFormValues";
import { usePortalTimer, type TimerMode } from "../_kit/usePortalTimer";

const ACCENT = "#38bdf8";
const inputClass =
  "w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400";

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-300">
      {children}
    </label>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-slate-800 py-8">
      <h2 className="mb-5 font-serif text-lg text-white">
        <span className="mr-3 text-sky-400">{n}.</span>
        {title}
      </h2>
      <div className="grid gap-5">{children}</div>
    </section>
  );
}

export default function NorthgatePortal() {
  const form = useFormValues();
  const timer = usePortalTimer("carrier-a");
  const [result, setResult] = useState<{ seconds: number | null; mode: TimerMode } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(timer.stop());
  }

  function startOver() {
    form.reset();
    timer.reset();
    setResult(null);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <DemoBanner />
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-sm border-2 border-sky-400 font-serif text-lg font-bold text-sky-400">
            N
          </div>
          <div>
            <div className="font-serif text-lg font-semibold tracking-wide text-white">NORTHGATE MUTUAL</div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Agent Services · Est. 1921</div>
          </div>
          <nav className="ml-auto hidden gap-5 text-sm text-slate-400 sm:flex">
            <span>Quotes</span>
            <span>Policies</span>
            <span>Claims</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {result ? (
          <QuoteResult carrier="Northgate Mutual" prefix="NGM" accent={ACCENT} {...result} onReset={startOver} />
        ) : (
          <>
            <h1 className="font-serif text-3xl text-white">Commercial Lines Application</h1>
            <p className="mt-2 text-sm text-slate-400">
              Complete all sections. Fields marked * are required. Incomplete applications may delay your quote.
            </p>

            <form onSubmit={handleSubmit} onFocus={timer.start} className="mt-6">
              <Section n={1} title="Applicant Information">
                <div>
                  <Label htmlFor="nm_legal">Legal Business Name *</Label>
                  <input {...form.field("nm_legal")} required className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="dba_nm">DBA / Trade Name</Label>
                  <input {...form.field("dba_nm")} className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="ent_struct">Business Structure</Label>
                  <select {...form.field("ent_struct")} className={inputClass}>
                    <option value="">-- Select --</option>
                    <option value="SP">Sole Proprietorship</option>
                    <option value="PTR">Partnership</option>
                    <option value="LLC">Limited Liability Company</option>
                    <option value="CORP">Corporation</option>
                    <option value="SCORP">S Corporation</option>
                    <option value="NP">Non-Profit</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="fein_no">Federal Employer ID (FEIN)</Label>
                  <input {...form.field("fein_no")} placeholder="XX-XXXXXXX" className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="yrs_bus">Years in Business</Label>
                  <input {...form.field("yrs_bus")} inputMode="numeric" className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="cls_bus">Industry / Class of Business</Label>
                  <input {...form.field("cls_bus")} className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="ops_desc">Description of Operations</Label>
                  <textarea {...form.field("ops_desc")} rows={3} className={inputClass} />
                </div>
              </Section>

              <Section n={2} title="Primary Contact">
                <div>
                  <Label htmlFor="cntct_full">Contact Name *</Label>
                  <input {...form.field("cntct_full")} required className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="cntct_ttl">Contact Title</Label>
                  <input {...form.field("cntct_ttl")} className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="cntct_eml">Email Address</Label>
                  <input {...form.field("cntct_eml")} type="email" className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="cntct_ph">Phone Number</Label>
                  <input {...form.field("cntct_ph")} type="tel" className={inputClass} />
                </div>
              </Section>

              <Section n={3} title="Mailing Address">
                <div>
                  <Label htmlFor="mail_addr1">Street Address</Label>
                  <input {...form.field("mail_addr1")} className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="mail_city">City</Label>
                  <input {...form.field("mail_city")} className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="mail_st">State</Label>
                  <select {...form.field("mail_st")} className={inputClass}>
                    <option value="">-- Select State --</option>
                    {US_STATES.map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="mail_zip">ZIP Code</Label>
                  <input {...form.field("mail_zip")} inputMode="numeric" className={inputClass} />
                </div>
              </Section>

              <Section n={4} title="Exposure Information">
                <div>
                  <Label htmlFor="emp_cnt">Number of Employees</Label>
                  <input {...form.field("emp_cnt")} inputMode="numeric" className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="rev_annual">Annual Revenue ($)</Label>
                  <input {...form.field("rev_annual")} inputMode="numeric" className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="pyrl_amt">Annual Payroll ($)</Label>
                  <input {...form.field("pyrl_amt")} inputMode="numeric" className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="loc_count">Number of Locations</Label>
                  <input {...form.field("loc_count")} inputMode="numeric" className={inputClass} />
                </div>
              </Section>

              <Section n={5} title="Coverage Requested">
                <div>
                  <Label htmlFor="lob_primary">Line of Business Requested</Label>
                  <select {...form.field("lob_primary")} className={inputClass}>
                    <option value="">-- Select --</option>
                    <option value="GL">General Liability</option>
                    <option value="WC">Workers Compensation</option>
                    <option value="PROP">Commercial Property</option>
                    <option value="AUTO">Commercial Auto</option>
                    <option value="BOP">Business Owners Policy (BOP)</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="eff_date">Proposed Effective Date (MM/DD/YYYY)</Label>
                  <input
                    {...form.field("eff_date")}
                    placeholder="MM/DD/YYYY"
                    pattern="\d{2}/\d{2}/\d{4}"
                    title="Use MM/DD/YYYY"
                    className={inputClass}
                  />
                </div>
                <div>
                  <Label htmlFor="lim_req">Limits Requested</Label>
                  <input {...form.field("lim_req")} placeholder="e.g. $1,000,000 / $2,000,000" className={inputClass} />
                </div>
              </Section>

              <Section n={6} title="Loss History">
                <div>
                  <Label htmlFor="prior_loss">Any losses in the past 5 years?</Label>
                  <select {...form.field("prior_loss")} className={inputClass}>
                    <option value="">-- Select --</option>
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="loss_desc">If yes, describe each loss (date, type, amount paid)</Label>
                  <textarea {...form.field("loss_desc")} rows={3} className={inputClass} />
                </div>
              </Section>

              <div className="border-t border-slate-800 pt-6">
                <label className="flex items-start gap-3 text-sm text-slate-300">
                  <input {...form.checkbox("attest_ok")} required className="mt-1 accent-sky-400" />
                  I confirm the information in this application is accurate to the best of my knowledge.
                </label>
                <button
                  type="submit"
                  className="mt-6 rounded bg-sky-400 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-300"
                >
                  Request Quote
                </button>
              </div>
            </form>
          </>
        )}
      </main>
      <TimerBadge status={timer.status} mode={timer.mode} elapsed={timer.elapsed} />
    </div>
  );
}
