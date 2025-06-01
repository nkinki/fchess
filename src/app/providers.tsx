"use client";

import { NeynarContextProvider } from "@neynar/react";
import { ReactNode } from "react";

// Ha van más provider is, azokat is importáld ide

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <NeynarContextProvider
      settings={{
        clientId: process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || "",
        defaultTheme: "dark",
        eventsCallbacks: {
          onAuthSuccess: () => {
            console.log("Authentication successful");
          },
          onSignout: () => {
            console.log("User signed out");
          },
        },
      }}
    >
      {/* Ha van más provider, azokat is add hozzá itt */}
      {children}
    </NeynarContextProvider>
  );
}
