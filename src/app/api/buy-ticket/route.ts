import { NextResponse } from "next/server";
import { Interface, parseUnits } from "ethers";

const CHESS_TOKEN_ADDRESS = "0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07";
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
];
const TREASURY_WALLET_ADDRESS = "0xdAAd35AA682DDaC4655642991A9224D1AB3Bce6a";
const TICKET_PRICE_CHESS_TOKENS = "1000";

export async function POST() {
  console.log("/api/buy-ticket POST request received. Target treasury:", TREASURY_WALLET_ADDRESS);
  try {
    const toAddress = TREASURY_WALLET_ADDRESS;
    const amountInSmallestUnit = parseUnits(TICKET_PRICE_CHESS_TOKENS, 0);
    const iface = new Interface(ERC20_ABI);
    const calldata = iface.encodeFunctionData("transfer", [toAddress, amountInSmallestUnit]);
    return NextResponse.json({
      chainId: "eip155:8453",
      method: "eth_sendTransaction",
      params: {
        abi: ERC20_ABI,
        to: CHESS_TOKEN_ADDRESS,
        data: calldata,
        value: "0",
      },
    });
  } catch (error) {
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