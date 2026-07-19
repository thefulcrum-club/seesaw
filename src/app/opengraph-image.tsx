import { renderOgImage, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "seesaw by fulcrum. — Market Simulation for Founders";

export default async function Image() {
  return renderOgImage({
    eyebrow: "an intelligence layer for founders",
    title: "market simulation, before you build.",
    subtitle:
      "Seesaw stress-tests your idea — market size, competitors, PMF signal, and a straight verdict.",
  });
}
