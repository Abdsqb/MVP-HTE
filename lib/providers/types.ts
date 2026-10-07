import type { z } from "zod";

/** Error with a message that is safe and useful to show in the UI. */
export class AIError extends Error {}

/** One structured-output call: system prompt + optional PDF + text in, schema-valid object out. */
export interface StructuredRequest<T extends z.ZodType> {
  schema: T;
  system: string;
  text: string;
  pdf?: { data: Buffer; name: string };
}

export interface Provider {
  /** Shown in the UI, e.g. "Claude". */
  name: string;
  model: string;
  generate<T extends z.ZodType>(req: StructuredRequest<T>): Promise<z.infer<T>>;
}
