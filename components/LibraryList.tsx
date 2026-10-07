"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { portalLabel } from "@/lib/config";
import type { Confidence, PortalMapping } from "@/lib/types";
import { Badge } from "./ui";

const TONE: Record<Confidence, "green" | "yellow" | "red"> = { high: "green", medium: "yellow", low: "red" };

function when(iso: string | null) {
  return iso ? new Date(iso).toLocaleString() : "never";
}

export default function LibraryList({ mappings }: { mappings: PortalMapping[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);

  async function forget(m: PortalMapping) {
    if (!window.confirm("Forget this form? The next fill will re-learn it with AI.")) return;
    await fetch(`/api/mappings/${m.signature}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {mappings.map((m) => {
        const mapped = m.fields.filter((f) => f.profilePath).length;
        const isOpen = open === m.signature;
        return (
          <section key={m.signature} className="rounded-xl border border-line bg-surface">
            <button onClick={() => setOpen(isOpen ? null : m.signature)} className="flex w-full items-center gap-4 p-4 text-left">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{portalLabel(`${m.hostname}${m.pathname}`)}</div>
                <div className="truncate font-mono text-xs text-muted">
                  {m.hostname}
                  {m.pathname} · {m.signature}
                </div>
              </div>
              <div className="hidden text-right text-xs text-muted sm:block">
                <div>
                  {mapped}/{m.fields.length} fields mapped
                </div>
                <div>
                  used {m.timesUsed}× · last {when(m.lastUsedAt)}
                </div>
              </div>
              <span className="text-muted">{isOpen ? "▾" : "▸"}</span>
            </button>

            {isOpen && (
              <div className="border-t border-line p-4">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted">
                    <tr>
                      <th className="pb-2 font-normal">Form field</th>
                      <th className="pb-2 font-normal">Profile data</th>
                      <th className="pb-2 font-normal">Format</th>
                      <th className="pb-2 font-normal">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.fields.map((f) => (
                      <tr key={f.fieldKey} className="border-t border-line align-top">
                        <td className="py-2 pr-3">
                          <div>{f.label}</div>
                          <div className="font-mono text-xs text-muted">{f.fieldKey}</div>
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs">
                          {f.profilePath ?? <span className="text-muted">not mapped</span>}
                          {f.checkWhen && <div className="text-muted">checked if {f.checkWhen}</div>}
                          {f.valueMap && Object.keys(f.valueMap).length > 0 && (
                            <div className="mt-1 text-muted">
                              {Object.entries(f.valueMap)
                                .map(([from, to]) => `${from}→${to}`)
                                .join(", ")}
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs text-muted">{f.transform && f.transform !== "none" ? f.transform : ""}</td>
                        <td className="py-2">{f.profilePath && <Badge tone={TONE[f.confidence]}>{f.confidence}</Badge>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 flex items-center justify-between text-xs text-muted">
                  <span>Learned {when(m.createdAt)}</span>
                  <button onClick={() => forget(m)} className="hover:text-red-300">
                    Forget this form
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
