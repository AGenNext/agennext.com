import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { JSONLD_CONTEXT, iri } from "@/lib/protocol";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AGenNext — protocol-first Schema.org data fabric",
  description:
    "An open, cloud-native, protocol-first platform that unifies sources into a Schema.org knowledge graph — queryable by protocol, browsable as Linked-Data HTML.",
  metadataBase: new URL("https://agennext.com"),
};

/** Site-level Organization node, emitted as JSON-LD for crawlers. */
const orgJsonLd = {
  "@context": JSONLD_CONTEXT,
  "@id": iri("agennext"),
  "@type": "Organization",
  name: "AGenNext",
  url: "https://agennext.com",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
          <Nav />
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-muted flex flex-wrap gap-x-4 gap-y-1">
            <span>Protocol agennext/1.0</span>
            <span>·</span>
            <span>Schema.org JSON-LD</span>
            <span>·</span>
            <span>Cloud-native · OpenTelemetry · SPIFFE · OpenFeature</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
