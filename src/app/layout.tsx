import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import "./globals.css";

/** Typo pro finance / admin : une seule famille claire et lisible */
const fontSans = IBM_Plex_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fontMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "MEGA SN SARL · Applications",
  description:
    "Plateforme MEGA SN — Finance, Signature et modules métiers (FCFA, SYSCOHADA)",
  applicationName: "MEGA SN",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user = null;
  try {
    user = await getSession();
  } catch {
    user = null;
  }

  const fontAliases = {
    "--font-display": "var(--font-ui)",
    "--font-body": "var(--font-ui)",
  } as CSSProperties;

  return (
    <html
      lang="fr"
      className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}
      style={fontAliases}
      suppressHydrationWarning
    >
      <body
        className="flex min-h-full text-[var(--foreground)]"
        suppressHydrationWarning
      >
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}
