// src/app/api/buy-ticket/route.ts
import { NextRequest, NextResponse } from "next/server";

// Feltételezzük, hogy Ethers v5 van telepítve, ahogy az előző hibakeresés során kiderült
const ethers = require("ethers");

const CHESS_TOKEN_ADDRESS = "0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07"; // A te CHESS tokened
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
];

// Ide kerül a CHESS token, amit a felhasználók "fizetnek"
const TREASURY_WALLET_ADDRESS = "0xdAAd35AA682DDaC4655642991A9224D1AB3Bce6a";

export async function POST(req: NextRequest) {
  console.log("/api/buy-ticket POST request received. Target treasury:", TREASURY_WALLET_ADDRESS);
  try {
    // Ellenőrzés Ethers v5-höz
    if (!ethers || !ethers.utils || !ethers.utils.parseUnits || !ethers.utils.Interface) {
      console.error("Ethers.js v5 utils or Interface not loaded correctly!");
      throw new Error("Ethers.js (v5) nem töltődött be megfelelően a szerver oldalon.");
    }

    // A `toAddress` most már a TREASURY_WALLET_ADDRESS lesz
    const toAddress = TREASURY_WALLET_ADDRESS;

    // A CHESS tokened 0 decimálissal rendelkezik, tehát 1000 token az 1000 egység
    const amountInSmallestUnit = ethers.utils.parseUnits("1000", 0);
    console.log("Amount to transfer (smallest unit):", amountInSmallestUnit.toString());

    const iface = new ethers.utils.Interface(ERC20_ABI);
    const calldata = iface.encodeFunctionData("transfer", [toAddress, amountInSmallestUnit]);
    console.log(`Generated calldata to transfer to ${toAddress}:`, calldata);

    return NextResponse.json({
      chainId: "8453", // Base mainnet
      target: CHESS_TOKEN_ADDRESS, // A CHESS token contract címe
      data: calldata,             // A `transfer` hívás adatai
      value: "0",                 // Nem küldünk ETH-t ezzel a tranzakcióval
    });

  } catch (error: any) {
    console.error("!!! CRITICAL API Error in /api/buy-ticket route:", error);
    return NextResponse.json(
      {
        message: "Szerveroldali hiba az API-ban.",
        errorDetails: error.message || "Ismeretlen hiba.",
      },
      { status: 500 }
    );
  }
}