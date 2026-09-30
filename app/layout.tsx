import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BuildMate AI — Build websites by describing them",
    template: "%s | BuildMate AI",
  },
  description:
    "Describe a website, get working code. BuildMate AI turns plain-language prompts into responsive, professional webpages — no coding needed.",
  keywords: [
    "AI website builder",
    "website generator",
    "no-code",
    "student project",
    "Gemini AI",
  ],
  authors: [{ name: "BuildMate AI" }],
  creator: "BuildMate AI",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "BuildMate AI",
    title: "BuildMate AI — Build websites by describing them",
    description:
      "Describe a website, get working code. 100 free credits on signup.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BuildMate AI",
    description: "Build websites by describing them. Free to start.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d0f14",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
