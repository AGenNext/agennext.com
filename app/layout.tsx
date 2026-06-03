import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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
        <header className="border-b border-border">
          <nav className="mx-auto max-w-6xl flex items-center gap-6 px-6 py-4">
            <Link href="/" className="font-semibold tracking-tight">
              <span className="text-accent">AGen</span>Next
            </Link>
            <div className="flex-1" />
            <Link href="/" className="text-sm text-muted hover:text-foreground">
              Explore
            </Link>
            <Link href="/stack" className="text-sm text-muted hover:text-foreground">
              Stack
            </Link>
            <Link href="/console" className="text-sm text-muted hover:text-foreground">
              Console
            </Link>
            <a
              href="/api/graph"
              className="text-sm text-muted hover:text-foreground font-mono"
            >
              API
            </a>
          </nav>
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
