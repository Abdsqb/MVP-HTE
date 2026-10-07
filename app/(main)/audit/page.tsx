import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { portalLabel } from "@/lib/config";
import { listAudit } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const audit = await listAudit();
  return (
    <>
      <PageHeader title="Audit log" subtitle="Every fill, by client and portal. Nothing is submitted without human review." />
      <Card>
        {audit.length === 0 ? (
          <EmptyState title="No fills yet">Fills made with the Formwise extension are recorded here.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="pb-2 font-normal">When</th>
                <th className="pb-2 font-normal">Client</th>
                <th className="pb-2 font-normal">Portal</th>
                <th className="pb-2 text-right font-normal">Filled</th>
                <th className="pb-2 text-right font-normal">To check</th>
                <th className="pb-2 text-right font-normal">Unmapped</th>
                <th className="pb-2 font-normal">&nbsp;Mapping</th>
                <th className="pb-2 text-right font-normal">Time</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id} className="border-t border-line">
                  <td className="py-2 pr-3 whitespace-nowrap text-muted">{new Date(a.timestamp).toLocaleString()}</td>
                  <td className="py-2 pr-3">
                    <Link href={`/clients/${a.clientId}`} className="hover:text-indigo-300">
                      {a.clientName}
                    </Link>
                  </td>
                  <td className="py-2 pr-3">
                    <div>{portalLabel(a.portal)}</div>
                    <div className="font-mono text-xs text-muted">{a.portal}</div>
                  </td>
                  <td className="py-2 text-right tabular-nums">{a.fieldsFilled}</td>
                  <td className="py-2 text-right tabular-nums">
                    {a.fieldsToCheck > 0 ? <span className="text-yellow-300">{a.fieldsToCheck}</span> : 0}
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted">{a.fieldsUnmapped}</td>
                  <td className="py-2 pl-3">
                    <Badge tone={a.source === "cached" ? "green" : "accent"}>{a.source === "cached" ? "saved" : "AI learned"}</Badge>
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted">{(a.durationMs / 1000).toFixed(1)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
