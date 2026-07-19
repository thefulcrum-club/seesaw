import type { Metadata } from "next";
import { Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://seesaw.thefulcrum.club";
const SITE_TITLE = "seesaw by fulcrum. — Market Simulation for Founders";
const SITE_DESCRIPTION =
  "Seesaw stress-tests your startup idea before you build it — market size, competitors, PMF signal, and a straight red, amber, or green verdict, powered by fulcrum.'s research pipeline.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: [
    "market research simulation",
    "startup idea validation",
    "market sizing",
    "competitor analysis",
    "product market fit",
    "seesaw",
    "fulcrum",
  ],
  applicationName: "seesaw",
  creator: "fulcrum.",
  publisher: "fulcrum.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "seesaw by fulcrum.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const webApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "seesaw",
  applicationCategory: "BusinessApplication",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  operatingSystem: "Any",
  publisher: {
    "@type": "Organization",
    name: "fulcrum.",
    url: "https://thefulcrum.club",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative overflow-x-hidden">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationJsonLd) }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 overflow-hidden -z-10"
        >
          <span
            className="absolute left-[12%] top-[18%] h-[520px] w-[520px] rounded-full"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--brand) 55%, transparent) 0%, transparent 65%)",
              filter: "blur(80px)",
              animation: "blob-a 22s ease-in-out infinite",
            }}
          />
          <span
            className="absolute right-[8%] top-[40%] h-[420px] w-[420px] rounded-full"
            style={{
              background:
                "radial-gradient(circle at 60% 40%, color-mix(in oklab, var(--brand) 40%, transparent) 0%, transparent 70%)",
              filter: "blur(90px)",
              animation: "blob-b 28s ease-in-out infinite",
            }}
          />
          <span
            className="absolute left-1/2 top-[120%] h-[600px] w-[600px] -translate-x-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--brand) 35%, transparent) 0%, transparent 70%)",
              filter: "blur(110px)",
              animation: "blob-c 32s ease-in-out infinite",
            }}
          />
        </div>
        <div
          aria-hidden="true"
          className="bg-noise pointer-events-none fixed inset-0 -z-10 mix-blend-overlay"
        />
        {children}
      </body>
    </html>
  );
}
