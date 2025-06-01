// src/app/layout.tsx

import type { Metadata } from "next";
import { Geist, Geist_Mono } from 'next/font/google';
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Farchess Chess",
  description: "Play chess, win money! A Farcaster chess game with $CHESS token rewards.",
  openGraph: {
    title: "Farchess Chess",
    description: "Play chess, win money! A Farcaster chess game with $CHESS token rewards.",
    url: "https://farchess.vercel.app",
    siteName: "Farchess",
    images: [
      {
        url: "https://farchess.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Farchess Chess Game",
      },
    ],
    locale: "hu_HU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Farchess Chess",
    description: "Play chess, win money! A Farcaster chess game with $CHESS token rewards.",
    images: ["https://farchess.vercel.app/og-image.png"],
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": "https://farchess.vercel.app/og-image.png",
    "fc:frame:button:1": "Play Chess",
    "fc:frame:button:1:action": "link",
    "fc:frame:button:1:target": "https://farchess.vercel.app",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#2fd7ff" />

        {/* Farcaster miniapp specific meta tags */}
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="https://farchess.vercel.app/og-image.png" />
        <meta property="fc:frame:button:1" content="Play Chess" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="https://farchess.vercel.app" />

        {/* Additional miniapp configuration */}
        <meta name="farcaster:miniapp" content="true" />
        <meta name="farcaster:miniapp:url" content="https://farchess.vercel.app" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
