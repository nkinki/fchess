// src/app/api/buy-ticket/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ethers, Interface, parseUnits } from "ethers"; // ES6 import Ethers v6-hoz

const CHESS_TOKEN_ADDRESS = "0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07"; // A te CHESS tokened
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
];

// Ide kerül a CHESS token, amit a felhasználók "fizetnek"
const TREASURY_WALLET_ADDRESS = "0xdAAd35AA682DDaC4655642991A9224D1AB3Bce6a";
const TICKET_PRICE_CHESS_TOKENS = "1000"; // Jegy ára CHESS tokenben

export async function POST(request: NextRequest) { // 'req' átnevezve 'request'-re, hogy elkerüljük a 'no-unused-vars' hibát, ha nem használjuk közvetlenül
  console.log("/api/buy-ticket POST request received. Target treasury:", TREASURY_WALLET_ADDRESS);
  try {
    // A request body-t itt lehetne feldolgozni, ha szükség lenne rá
    // const body = await request.json();
    // console.log("Request body:", body); // Példa a request body feldolgozására

    const toAddress = TREASURY_WALLET_ADDRESS;

    // A CHESS tokened 0 decimálissal rendelkezik, tehát 1000 token az 1000 egység
    // Ethers v6 parseUnits használata
    const amountInSmallestUnit = parseUnits(TICKET_PRICE_CHESS_TOKENS, 0);
    console.log("Amount to transfer (smallest unit):", amountInSmallestUnit.toString());

    // Ethers v6 Interface használata
    const iface = new Interface(ERC20_ABI);
    const calldata = iface.encodeFunctionData("transfer", [toAddress, amountInSmallestUnit]);
    console.log(`Generated calldata to transfer to ${toAddress}:`, calldata);

    return NextResponse.json({
      chainId: "eip155:8453", // Base mainnet, javasolt a CAIP-2 formátum használata a chainId-hoz Frames esetén
      method: "eth_sendTransaction", // A tranzakció típusa
      params: {
        abi: ERC20_ABI, // Teljes ABI a tranzakcióhoz (vagy csak a releváns rész)
        to: CHESS_TOKEN_ADDRESS, // A CHESS token contract címe
        data: calldata,          // A `transfer` hívás adatai
        value: "0",              // Nem küldünk ETH-t ezzel a tranzakcióval
      },
    });

  } catch (error) { // Az 'error' típusa 'unknown' vagy 'Error' lehet, explicit 'any' helyett
    console.error("!!! CRITICAL API Error in /api/buy-ticket route:", error);
    const errorMessage = error instanceof Error ? error.message : "Ismeretlen hiba.";
    return NextResponse.json(
      {
        message: "Szerveroldali hiba az API-ban.",
        errorDetails: errorMessage,
      },
      { status: 500 }
    );
  }
}