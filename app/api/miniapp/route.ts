import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Basic miniapp configuration response
  const config = {
    name: "Farchess Chess",
    description: "Play chess, win money!",
    url: "https://farchess.vercel.app",
    version: "1.0.0",
    permissions: ["identity", "transactions"],
    features: {
      chess: true,
      tokens: true,
      leaderboard: true,
    },
  }

  return NextResponse.json(config, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle miniapp interactions
    console.log("Miniapp interaction:", body)

    return NextResponse.json({
      success: true,
      message: "Interaction received",
    })
  } catch (error) {
    console.error("Miniapp API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
