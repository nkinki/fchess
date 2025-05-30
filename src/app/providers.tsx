// src/app/providers.tsx
"use client";
import { NeynarContextProvider } from "@neynar/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NeynarContextProvider
      settings={{
        clientId: "c889f600-9421-4d1c-8595-ef551f808cd2",
      }}
    >
      {children}
    </NeynarContextProvider>
  );
}