import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  // Google's hosted Playfair Display is a variable font; satori (next/og)
  // doesn't resolve variable-font axes and silently falls back to the
  // upright master, so italics never render. This is a static, single-
  // instance TTF pre-instantiated via fonttools (varLib.instancer).
  const fontData = await readFile(join(process.cwd(), "assets/fonts/PlayfairDisplay-Italic-600.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
        }}
      >
        <div
          style={{
            fontFamily: "Playfair Display",
            fontStyle: "italic",
            fontWeight: 600,
            fontSize: 24,
            color: "#f5f5f5",
            display: "flex",
            lineHeight: 1,
          }}
        >
          f<span style={{ color: "#6187ec" }}>.</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Playfair Display",
          data: fontData,
          style: "italic",
          weight: 600,
        },
      ],
    }
  );
}
