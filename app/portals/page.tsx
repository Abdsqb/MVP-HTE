import Link from "next/link";
import { APP_NAME, PORTALS } from "@/lib/config";

export const metadata = { title: "Demo carrier portals" };

export default function PortalsIndex() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm text-zinc-500">{APP_NAME} demo</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Mock carrier portals</h1>
      <p className="mt-2 max-w-2xl text-zinc-400">
        Three fictional insurance carriers asking for the same client data with different layouts, labels and field
        names. Fill them by hand to get a manual baseline time, then with the {APP_NAME} extension.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {PORTALS.map((portal) => (
          <Link
            key={portal.slug}
            href={`/portals/${portal.slug}`}
            className="group rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-600"
          >
            <div className="mb-4 h-1.5 w-10 rounded-full" style={{ background: portal.accent }} />
            <div className="font-semibold text-white">{portal.name}</div>
            <p className="mt-1 text-sm text-zinc-400">{portal.blurb}</p>
            <div className="mt-4 font-mono text-xs text-zinc-500 group-hover:text-zinc-300">/portals/{portal.slug} →</div>
          </Link>
        ))}
      </div>

      <Link href="/" className="mt-10 inline-block text-sm text-zinc-500 hover:text-zinc-300">
        ← Back to {APP_NAME}
      </Link>
    </main>
  );
}
