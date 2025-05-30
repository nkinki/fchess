// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Geist helyett Inter, ha azzal indítottad a projektet
// Vagy ha a Geist-et használod:
// import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import "@neynar/react/dist/style.css"; // Neynar stílusok importálása

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
// const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
// const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });


export const metadata: Metadata = {
  title: "Farchess Sakk", // Frissített cím
  description: "Farcaster sakk miniapp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu"> {/* Nyelv 'hu'-ra állítva */}
      {/* A font változót a body className-hez kell adni */}
      <body className={`${inter.variable} antialiased`}>
      {/* Vagy Geist esetén: */}
      {/* <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}> */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}