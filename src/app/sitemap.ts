import type { MetadataRoute } from "next";

const SITE_URL = "https://seesaw.thefulcrum.club";

// /sessions and /sessions/[id] contain user-submitted business ideas and
// aren't meant for public search indexing — see robots.ts, which disallows
// the whole /sessions tree.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
