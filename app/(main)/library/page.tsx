import Link from "next/link";
import LibraryList from "@/components/LibraryList";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { ai } from "@/lib/ai";
import { listMappings } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const mappings = await listMappings();
  return (
    <>
      <PageHeader title="Portal library" subtitle="Every portal Formwise has learned. Saved mappings fill instantly, with no AI call." />
      {mappings.length === 0 ? (
        <Card>
          <EmptyState title="No portals learned yet">
            Open a <Link href="/portals" className="text-indigo-300 underline">demo portal</Link> with the Formwise extension
            and click Fill. {ai.name} learns the form once (it only sees the form&apos;s labels, never client data) and it is saved here.
          </EmptyState>
        </Card>
      ) : (
        <LibraryList mappings={mappings} />
      )}
    </>
  );
}
