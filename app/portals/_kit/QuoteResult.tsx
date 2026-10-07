"use client";

import { useState } from "react";
import type { TimerMode } from "./usePortalTimer";

function randomQuote(prefix: string) {
  const number = `${prefix}-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const premium = Math.round((1800 + Math.random() * 9000) / 10) * 10;
  return { number, premium };
}

/** Fake quote confirmation shown after a portal form is submitted. */
export function QuoteResult({
  carrier,
  prefix,
  accent,
  seconds,
  mode,
  onReset,
}: {
  carrier: string;
  prefix: string;
  accent: string;
  seconds: number | null;
  mode: TimerMode;
  onReset: () => void;
}) {
  // Generated once when the confirmation appears.
  const [quote] = useState(() => randomQuote(prefix));

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
      <div
        className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full text-xl text-black"
        style={{ background: accent }}
      >
        ✓
      </div>
      <h2 className="text-xl font-semibold text-white">Quote request received</h2>
      <p className="mt-1 text-sm text-zinc-400">{carrier} has issued an indicative quote.</p>
      <dl className="mt-6 grid grid-cols-2 gap-4 text-left">
        <div className="rounded-lg bg-zinc-950 p-4">
          <dt className="text-xs text-zinc-500">Quote number</dt>
          <dd className="mt-1 font-mono text-sm text-white">{quote.number}</dd>
        </div>
        <div className="rounded-lg bg-zinc-950 p-4">
          <dt className="text-xs text-zinc-500">Estimated annual premium</dt>
          <dd className="mt-1 text-lg font-semibold" style={{ color: accent }}>
            ${quote.premium.toLocaleString()}
          </dd>
        </div>
      </dl>
      <p className="mt-6 text-xs text-zinc-500">
        {seconds === null ? (
          "The demo timer never started, so this run was not recorded."
        ) : (
          <>
            Completed in <span className="font-mono text-zinc-300">{seconds.toFixed(1)}s</span> ({mode} fill).
            Saved to the demo timings.
          </>
        )}
      </p>
      <button
        onClick={onReset}
        className="mt-6 rounded-md px-4 py-2 text-sm font-medium text-black"
        style={{ background: accent }}
      >
        Start a new quote
      </button>
    </div>
  );
}
