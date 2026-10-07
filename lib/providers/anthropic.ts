import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { AIError, type Provider, type StructuredRequest } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

// Server-side refusal fallback is only accepted on these models.
const FALLBACK_MODELS = ["claude-sonnet-5-5", "claude-opus-5-5", "claude-opus-5", "claude-fable-5-1"];

let client: Anthropic | null = null;

async function generate<T extends z.ZodType>({ schema, system, text, pdf }: StructuredRequest<T>): Promise<z.infer<T>> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (pdf) {
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: pdf.data.toString("base64") },
      title: pdf.name,
    });
  }
  content.push({ type: "text", text });

  const useFallback = FALLBACK_MODELS.includes(MODEL);
  let response;
  try {
    client ??= new Anthropic();
    response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content }],
      output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
      ...(useFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || (err instanceof Error && /api key|apiKey|authentication|credentials/i.test(err.message))) {
      throw new AIError("Claude API key missing or invalid. Add ANTHROPIC_API_KEY to .env.local and restart.");
    }
    if (err instanceof Anthropic.RateLimitError) throw new AIError("Claude rate limit hit. Wait a moment and try again.");
    if (err instanceof Anthropic.BadRequestError) throw new AIError(`Claude rejected the request: ${err.message}`);
    if (err instanceof Anthropic.APIError) throw new AIError(`Claude API error (${err.status ?? "network"}): ${err.message}`);
    throw err;
  }

  if (response.stop_reason === "refusal") throw new AIError("Claude declined to process this request.");
  if (response.stop_reason === "max_tokens") throw new AIError("Claude's answer was cut off. Try a shorter document.");
  if (!response.parsed_output) throw new AIError("Claude returned an answer that did not match the expected format.");
  return response.parsed_output;
}

export const anthropicProvider: Provider = { name: "Claude", model: MODEL, generate };
