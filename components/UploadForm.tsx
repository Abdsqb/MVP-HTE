"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Drop a PDF (or pick a bundled sample), wait for the AI, land on the review screen. */
export default function UploadForm({ samples, aiName }: { samples: string[]; aiName: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - started) / 1000), 200);
    return () => clearInterval(id);
  }, [busy]);

  async function extract(label: string, init: RequestInit) {
    setBusy(label);
    setElapsed(0);
    setError(null);
    try {
      const res = await fetch("/api/extract", { method: "POST", ...init });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Extraction failed.");
      router.push(`/clients/${body.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(null);
    }
  }

  function uploadFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) return setError("Only PDF files are supported.");
    const body = new FormData();
    body.append("file", file);
    extract(file.name, { body });
  }

  if (busy) {
    return (
      <div className="rounded-xl border border-line bg-surface px-6 py-16 text-center">
        <div className="mx-auto mb-5 h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
        <div className="font-medium">Reading {busy}</div>
        <p className="mt-1 text-sm text-muted">
          {aiName} is pulling out business details, exposures, coverage and loss history. This usually takes 20-60 seconds.
        </p>
        <div className="mt-4 font-mono text-xs tabular-nums text-muted">{elapsed.toFixed(0)}s</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          uploadFile(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors ${
          dragging ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-zinc-600"
        }`}
      >
        <div className="text-lg font-medium">Drop a questionnaire PDF here</div>
        <p className="mt-1 text-sm text-muted">or click to choose a file. Forms, letters and scanned notes all work.</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => uploadFile(e.target.files?.[0])}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {samples.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted">Or try a sample document</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {samples.map((name) => (
              <button
                key={name}
                onClick={() => extract(name, { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sample: name }) })}
                className="rounded-xl border border-line bg-surface p-4 text-left transition-colors hover:border-zinc-600"
              >
                <div className="text-sm font-medium">{name.replace(/\.pdf$/, "").replace(/-/g, " ")}</div>
                <div className="mt-1 font-mono text-xs text-muted">{name}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
