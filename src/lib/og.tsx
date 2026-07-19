import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };

// Google's hosted Playfair Display/JetBrains Mono are variable fonts; satori
// (next/og) doesn't resolve variable-font axes, so it silently falls back to
// the default (upright) master and italics never render. These are static,
// single-instance TTFs pre-instantiated via fonttools (varLib.instancer),
// checked into assets/fonts.
async function loadFonts() {
  const [playfairItalic, jetbrainsMono] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/PlayfairDisplay-Italic-600.ttf")),
    readFile(join(process.cwd(), "assets/fonts/JetBrainsMono-500.ttf")),
  ]);
  return [
    { name: "Playfair Display", data: playfairItalic, style: "italic" as const, weight: 600 as const },
    { name: "JetBrains Mono", data: jetbrainsMono, style: "normal" as const, weight: 500 as const },
  ];
}

export async function renderOgImage({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  const fonts = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#000000",
          padding: "72px 80px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -160,
            width: 560,
            height: 560,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(22,18,211,0.55) 0%, rgba(22,18,211,0) 70%)",
            display: "flex",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "JetBrains Mono",
              fontSize: 22,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#9a9a9a",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Playfair Display",
              fontStyle: "italic",
              fontWeight: 600,
              fontSize: 30,
              color: "#f5f5f5",
            }}
          >
            seesaw<span style={{ color: "#6187ec" }}>.</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Playfair Display",
              fontStyle: "italic",
              fontWeight: 600,
              fontSize: 76,
              lineHeight: 1.08,
              color: "#f5f5f5",
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                display: "flex",
                marginTop: 28,
                fontFamily: "JetBrains Mono",
                fontSize: 24,
                lineHeight: 1.5,
                color: "#9a9a9a",
                maxWidth: 880,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: "JetBrains Mono",
            fontSize: 20,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#6187ec",
          }}
        >
          seesaw.thefulcrum.club
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts,
    }
  );
}
