// Product branding lives here so the name can be changed in one place.
export const APP_NAME = "Formwise";
export const APP_TAGLINE = "AI paperwork optimizer";

// The three mock carrier portals used in the demo.
export const PORTALS = [
  {
    slug: "carrier-a",
    name: "Northgate Mutual",
    blurb: "One long single-page application form.",
    accent: "#38bdf8",
  },
  {
    slug: "carrier-b",
    name: "Bluecrest Insurance",
    blurb: "Three-step wizard with Next / Back.",
    accent: "#a78bfa",
  },
  {
    slug: "carrier-c",
    name: "Harborline Commercial",
    blurb: "Two-column form with radios, checkboxes and a claims table.",
    accent: "#f59e0b",
  },
] as const;

export type PortalSlug = (typeof PORTALS)[number]["slug"];

/** Friendly name for a portal slug or URL path ("localhost/portals/carrier-a" -> "Northgate Mutual"). */
export function portalLabel(slugOrPath: string): string {
  const slug = slugOrPath.match(/(carrier-[a-z])\/?$/)?.[1] ?? slugOrPath;
  return PORTALS.find((p) => p.slug === slug)?.name ?? slugOrPath;
}
