import { ImageResponse } from "next/og";

// Next.js App Router's `icon.tsx` convention — auto-generates the favicon at build time and
// serves it at /icon (linked into the document's <head> automatically, no manifest/metadata
// wiring needed). Renders the exact same Sparkles glyph (lucide-react's icon path, copied
// verbatim from node_modules/lucide-react/dist/esm/icons/sparkles.mjs) in the exact same primary
// blue (#00a8ff, from globals.css's --primary) that appears next to "Digital Subs BD" in the
// navbar/footer/admin sidebar everywhere else in the app — the site had no favicon at all before
// this, just the browser's default. Background is the app's own dark --background (#020617),
// matching the navbar's real dark backdrop rather than a plain transparent square, so the
// browser-tab icon reads as the same mark a visitor already sees on the page itself.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020617",
          borderRadius: 6,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"
            fill="#00a8ff"
          />
          <path d="M20 2v4" stroke="#00a8ff" strokeWidth="2" strokeLinecap="round" />
          <path d="M22 4h-4" stroke="#00a8ff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="4" cy="20" r="2" fill="#00a8ff" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
