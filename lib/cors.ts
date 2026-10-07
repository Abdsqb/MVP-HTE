// CORS helpers so the Chrome extension (and portal pages) can call the API.
// Wide open on purpose: this app only runs locally for a single user.
import { NextResponse } from "next/server";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders });
}

export function errorJson(message: string, status = 400) {
  return json({ error: message }, status);
}

/** Answer browser preflight requests. Export as OPTIONS from each route. */
export function preflight() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
