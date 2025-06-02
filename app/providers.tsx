"use client"

import { NeynarContextProvider } from "@neynar/react"
import type { ReactNode } from "react"

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <NeynarContextProvider
      settings={{
        clientId: process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || "",
        eventsCallbacks: {
          onAuthSuccess: () => {
            console.log("Authentication successful")
          },
          onSignout: () => {
            console.log("User signed out")
          },
        },
      }}
    >
      {children}
    </NeynarContextProvider>
  )
}
