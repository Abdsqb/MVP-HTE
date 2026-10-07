"use client";

import Link from "next/link";
import type { TimerMode } from "./usePortalTimer";

/** Thin bar above every mock portal so nobody mistakes it for a real carrier. */
export function DemoBanner() {
  return (
    <div className="flex items-center justify-between bg-black px-4 py-1.5 text-xs text-zinc-500">
      <span>Fictional carrier portal for the demo. No data leaves this computer.</span>
      <Link href="/portals" className="hover:text-zinc-300">
        ← All demo portals
      </Link>
    </div>
  );
}

/** Small floating demo timer (bottom-left, so the extension panel can use bottom-right). */
export function TimerBadge({ status, mode, elapsed }: { status: string; mode: TimerMode; elapsed: number }) {
  const dot =
    status === "running" ? "bg-red-500 animate-pulse" : status === "stopped" ? "bg-emerald-500" : "bg-zinc-600";
  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/95 px-3 py-1.5 font-mono text-xs text-zinc-300 shadow-lg">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span>Demo timer</span>
      <span className="tabular-nums text-white">{elapsed.toFixed(1)}s</span>
      <span className={mode === "auto" ? "text-indigo-300" : "text-zinc-500"}>
        {status === "idle" ? "waiting" : mode}
      </span>
    </div>
  );
}
