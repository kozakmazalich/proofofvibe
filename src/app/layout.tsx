import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Proof of Vibe — Vibe Scanner for vibe/vibe",
  description:
    "Scan any X username: posts mentioning @vibevibefun & @vibevibeeco, likes, views, engagement and Vibe Vibers Battlegrounds rank.",
  openGraph: {
    title: "Proof of Vibe",
    description: "How hard do you vibe? Scan your X activity for vibe/vibe.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Proof of Vibe", site: "@vibevibefun" },
};

export const viewport: Viewport = {
  themeColor: "#07060b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg font-sans text-white selection:bg-vibe selection:text-black">{children}</body>
    </html>
  );
}
