import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader, Stat } from "@/components/ui";
import { PORTALS, portalLabel } from "@/lib/config";
import { listAudit, listMappings, listProfiles, listTimings } from "@/lib/storage";
import type { ClientProfile, TimingRecord } from "@/lib/types";

// Always read fresh data from /data on each request.
export const dynamic = "force-dynamic";

function toCheck(p: ClientProfile) {
  const fields = [
    ...Object.values(p.business),
    ...Object.values(p.contact),
    ...Object.values(p.address),
    ...Object.values(p.operations),
    ...Object.values(p.coverage),
    ...p.claimsHistory.flatMap((c) => Object.values(c)),
  ];
  return fields.filter((f) => f.confidence !== "high").length;
}

function average(runs: TimingRecord[]) {
  return runs.length ? runs.reduce((sum, t) => sum + t.seconds, 0) / runs.length : null;
}

const fmt = (s: number | null) => (s === null ? "-" : `${s.toFixed(1)}s`);

export default async function DashboardPage() {
  const [profiles, mappings, audit, timings] = await Promise.all([
    listProfiles(),
    listMappings(),
    listAudit(),
    listTimings(),
  ]);

  const comparison = PORTALS.map((portal) => {
    const runs = timings.filter((t) => t.portal === portal.slug);
    const manual = average(runs.filter((t) => t.mode === "manual"));
    const auto = average(runs.filter((t) => t.mode === "auto"));
    return { portal, manual, auto, saved: manual !== null && auto !== null ? 1 - auto / manual : null };
  });

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Collect → Organize → Submit. One client profile, every carrier portal."
        action={
          <Link href="/upload" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium hover:bg-indigo-500">
            Upload documents
          </Link>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Clients" value={profiles.length} hint={`${profiles.filter((p) => p.reviewed).length} reviewed`} />
        <Stat label="Portals in library" value={mappings.length} />
        <Stat label="Total fills" value={audit.length} hint={`${audit.filter((a) => a.source === "cached").length} from saved mappings`} />
        <Stat label="Timed portal runs" value={timings.length} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Clients">
          {profiles.length === 0 ? (
            <EmptyState title="No clients yet">
              <Link href="/upload" className="text-indigo-300 underline">Upload a questionnaire PDF</Link> to create the first profile.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {profiles.map((p) => {
                const n = toCheck(p);
                return (
                  <li key={p.id}>
                    <Link href={`/clients/${p.id}`} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-surface-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{p.business.legalName.value || "Unnamed client"}</div>
                        <div className="truncate font-mono text-xs text-muted">{p.sourceFileName}</div>
                      </div>
                      {p.reviewed ? (
                        <Badge tone="green">reviewed</Badge>
                      ) : (
                        <Badge tone="yellow">{n > 0 ? `${n} to check` : "needs review"}</Badge>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Time per portal: by hand vs Formwise">
          {timings.length === 0 ? (
            <EmptyState title="No timed runs yet">
              Open a <Link href="/portals" className="text-indigo-300 underline">demo portal</Link>, fill it in and submit.
            </EmptyState>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="text-left text-muted">
                  <tr>
                    <th className="pb-2 font-normal">Portal</th>
                    <th className="pb-2 text-right font-normal">By hand</th>
                    <th className="pb-2 text-right font-normal">Formwise</th>
                    <th className="pb-2 text-right font-normal">Saved</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map(({ portal, manual, auto, saved }) => (
                    <tr key={portal.slug} className="border-t border-line">
                      <td className="py-2">{portal.name}</td>
                      <td className="py-2 text-right tabular-nums">{fmt(manual)}</td>
                      <td className="py-2 text-right tabular-nums">{fmt(auto)}</td>
                      <td className="py-2 text-right tabular-nums">
                        {saved === null ? "-" : <span className="text-emerald-300">{Math.round(saved * 100)}%</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="mb-2 mt-6 text-xs font-medium text-muted">Recent runs</h3>
              <table className="w-full text-sm">
                <tbody>
                  {timings.slice(0, 6).map((t) => (
                    <tr key={t.id} className="border-t border-line">
                      <td className="py-2">{portalLabel(t.portal)}</td>
                      <td className="py-2">
                        <Badge tone={t.mode === "auto" ? "accent" : "neutral"}>{t.mode}</Badge>
                      </td>
                      <td className="py-2 text-right tabular-nums">{t.seconds.toFixed(1)}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
