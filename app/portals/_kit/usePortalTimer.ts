"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type TimerMode = "manual" | "auto";
type Status = "idle" | "running" | "stopped";

/**
 * Demo timer for a mock portal.
 * - Starts on the first interaction (call `start`), or when the Formwise
 *   extension announces a fill with the "formwise:fill" window event.
 * - Stops on submit (`stop`) and records the run to /api/timings.
 */
export function usePortalTimer(portal: string) {
  const startedAt = useRef<number | null>(null);
  const modeRef = useRef<TimerMode>("manual");
  const clientRef = useRef<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [mode, setMode] = useState<TimerMode>("manual");
  const [elapsed, setElapsed] = useState(0);

  const begin = useCallback((nextMode: TimerMode) => {
    startedAt.current = Date.now();
    modeRef.current = nextMode;
    setMode(nextMode);
    setElapsed(0);
    setStatus("running");
  }, []);

  /** Start in manual mode on the first focus/keystroke. Does nothing if already running. */
  const start = useCallback(() => {
    if (startedAt.current === null) begin("manual");
  }, [begin]);

  // The extension dispatches: new CustomEvent("formwise:fill", { detail: JSON.stringify({ clientId }) })
  // If the user had started typing by hand, the clock restarts so "auto" measures fill + review only.
  // Multi-step forms send one event per step; later steps keep the original start time.
  useEffect(() => {
    function onFill(event: Event) {
      try {
        const detail = JSON.parse(String((event as CustomEvent).detail ?? "{}"));
        clientRef.current = detail.clientId ?? null;
      } catch {
        clientRef.current = null;
      }
      if (modeRef.current !== "auto" || startedAt.current === null) begin("auto");
    }
    window.addEventListener("formwise:fill", onFill);
    return () => window.removeEventListener("formwise:fill", onFill);
  }, [begin]);

  // Tick the on-screen clock while running.
  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => setElapsed((Date.now() - (startedAt.current ?? Date.now())) / 1000), 100);
    return () => clearInterval(id);
  }, [status]);

  /** Stop the clock, save the run, and return the elapsed seconds (null if it never started). */
  const stop = useCallback(() => {
    setStatus("stopped");
    if (startedAt.current === null) return { seconds: null, mode: modeRef.current };
    const seconds = (Date.now() - startedAt.current) / 1000;
    setElapsed(seconds);
    fetch("/api/timings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portal, mode: modeRef.current, seconds, clientId: clientRef.current }),
    }).catch((err) => console.error("Could not save timing", err));
    return { seconds, mode: modeRef.current };
  }, [portal]);

  const reset = useCallback(() => {
    startedAt.current = null;
    modeRef.current = "manual";
    clientRef.current = null;
    setMode("manual");
    setElapsed(0);
    setStatus("idle");
  }, []);

  return { status, mode, elapsed, start, stop, reset };
}
