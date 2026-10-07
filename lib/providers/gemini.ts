import { ApiError, GoogleGenAI, type Part } from "@google/genai";
import { z } from "zod";
import { AIError, type Provider, type StructuredRequest } from "./types";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

let client: GoogleGenAI | null = null;

/**
 * Zod -> the JSON Schema subset Gemini documents: no "$schema" keyword, and
 * nullable types ({"type": ["string","null"]}) spelled as anyOf.
 */
function jsonSchema(schema: z.ZodType) {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  const normalize = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(normalize);
    if (!node || typeof node !== "object") return node;
    const out = Object.fromEntries(Object.entries(node).map(([k, v]) => [k, normalize(v)]));
    if (Array.isArray(out.type)) {
      const { type, ...others } = out;
      return { ...others, anyOf: (type as string[]).map((t) => ({ type: t })) };
    }
    return out;
  };
  return normalize(rest);
}

async function generate<T extends z.ZodType>({ schema, system, text, pdf }: StructuredRequest<T>): Promise<z.infer<T>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AIError("GEMINI_API_KEY is missing. Add it to .env.local and restart npm run dev.");
  client ??= new GoogleGenAI({ apiKey });

  const parts: Part[] = [];
  if (pdf) parts.push({ inlineData: { mimeType: "application/pdf", data: pdf.data.toString("base64") } });
  parts.push({ text });

  let response;
  try {
    response = await client.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: { systemInstruction: system, responseMimeType: "application/json", responseJsonSchema: jsonSchema(schema) },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 429) {
        throw new AIError("Gemini free-tier rate limit reached. Wait a minute and retry (daily limits reset at midnight Pacific).");
      }
      if (err.status === 401 || err.status === 403 || /api key/i.test(err.message)) {
        throw new AIError("Gemini API key invalid. Check GEMINI_API_KEY in .env.local and restart.");
      }
      throw new AIError(`Gemini API error (${err.status}): ${err.message.slice(0, 300)}`);
    }
    throw err;
  }

  const output = response.text;
  if (!output) {
    const reason = response.candidates?.[0]?.finishReason ?? response.promptFeedback?.blockReason ?? "unknown";
    throw new AIError(`Gemini returned no answer (reason: ${reason}).`);
  }
  let json: unknown;
  try {
    json = JSON.parse(output);
  } catch {
    throw new AIError("Gemini's answer was cut off or was not valid JSON. Try again.");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new AIError("Gemini returned an answer that did not match the expected format. Try again.");
  return parsed.data;
}

export const geminiProvider: Provider = { name: "Gemini", model: MODEL, generate };
