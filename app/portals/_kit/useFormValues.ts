"use client";

import { useState } from "react";

/**
 * Keeps every portal input as React state (controlled inputs), like a real
 * React app. This is exactly why the extension must use the native value
 * setter + input/change events: setting `.value` alone would be ignored.
 */
export function useFormValues() {
  const [values, setValues] = useState<Record<string, string>>({});
  const set = (name: string, value: string) => setValues((v) => ({ ...v, [name]: value }));

  /** Props for a text input, textarea or select. `id` defaults to `name`. */
  const field = (name: string, id = name) => ({
    id,
    name,
    value: values[name] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      set(name, e.target.value),
  });

  const checkbox = (name: string, id = name) => ({
    id,
    name,
    type: "checkbox" as const,
    checked: values[name] === "on",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(name, e.target.checked ? "on" : ""),
  });

  const radio = (name: string, value: string) => ({
    id: `${name}_${value}`,
    name,
    value,
    type: "radio" as const,
    checked: values[name] === value,
    onChange: () => set(name, value),
  });

  return { values, set, field, checkbox, radio, reset: () => setValues({}) };
}
