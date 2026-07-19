import type { MetadataRoute } from "next";

const SITE_URL = "https://seesaw.thefulcrum.club";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // user-submitted business ideas — not for public search indexing.
      disallow: "/sessions",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
