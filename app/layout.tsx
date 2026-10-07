import type { Metadata } from "next";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} · ${APP_TAGLINE}`,
  description: "Collect, organize and submit insurance paperwork with AI.",
};

// Root layout is intentionally bare: the Formwise app (app/(main)) and the
// mock carrier portals (app/portals) each bring their own look.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
