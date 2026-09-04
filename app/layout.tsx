import type { Metadata } from "next";
import { Inter_Tight, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Marg",
  description: "AI-guided brand kits and proposals",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      {/* No manual Google Fonts <link> here — next/font above already self-hosts Inter Tight,
          Instrument Serif, and JetBrains Mono at build time. A separate stylesheet link for the
          same families would just be a second, render-blocking fetch of fonts already inlined. */}
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
