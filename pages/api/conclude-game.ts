import { db } from '@vercel/postgres';
import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const BASE_RPC_URL = 'https://mainnet.base.org';
const CHESS_TOKEN_ADDRESS = '0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07'; 
const CHESS_TOKEN_ABI = ["function transfer(address to, uint256 amount)"];
const PRIZE_AMOUNT = ethers.parseUnits("10", 18);

async function sendPrize(recipientAddress: string): Promise<string> {
  console.log("[sendPrize] Függvény elindult.");
  const privateKey = process.env.HOT_WALLET_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error("[sendPrize] KRITIKUS HIBA: A HOT_WALLET_PRIVATE_KEY nincs beállítva!");
    throw new Error("Szerver konfigurációs hiba: a wallet kulcs hiányzik.");
  }
  console.log("[sendPrize] Privát kulcs sikeresen beolvasva.");

  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  console.log("[sendPrize] RPC Provider létrehozva a Base hálózathoz.");
  
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`[sendPrize] Wallet létrehozva a következő címhez: ${wallet.address}`);

  const tokenContract = new ethers.Contract(CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI, wallet);
  console.log(`[sendPrize] Token szerződés (${CHESS_TOKEN_ADDRESS}) példányosítva.`);

  console.log(`[sendPrize] Tranzakció küldése indul: ${ethers.formatUnits(PRIZE_AMOUNT, 18)} $CHESS a(z) ${recipientAddress} címre...`);
  const tx = await tokenContract.transfer(recipientAddress, PRIZE_AMOUNT);
  
  console.log(`[sendPrize] Tranzakció elküldve, hash (előzetes): ${tx.hash}. Várakozás a megerősítésre...`);
  await tx.wait();

  console.log(`[sendPrize] Tranzakció sikeresen megerősítve! Végleges hash: ${tx.hash}`);
  return tx.hash;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("--- API HÍVÁS: /api/conclude-game (START) ---");

  if (req.method !== 'POST') {
    console.error("Hiba: Nem POST kérés. Fogadott metódus:", req.method);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { fid, winner, wasFreeGame, custodyAddress } = req.body;
  console.log("Kérés törzsének (body) adatai:", { fid, winner, wasFreeGame, custodyAddress });

  if (!fid) {
    console.error("Hiba: A kérésből hiányzik a FID.");
    return res.status(400).json({ error: 'FID is required' });
  }

  try {
    console.log("Adatbázis-művelet megkezdése...");
    await db.sql`
      INSERT INTO users (fid, has_played_free_game, custody_address)
      VALUES (${String(fid)}, TRUE, ${custodyAddress})
      ON CONFLICT (fid) 
      DO UPDATE SET 
        has_played_free_game = TRUE, 
        custody_address = COALESCE(${custodyAddress}, users.custody_address);
    `;
    console.log("Adatbázis-művelet sikeresen befejeződött.");

    if (winner === 'user' && wasFreeGame) {
      console.log("Nyereményküldési feltételek teljesültek. Cím ellenőrzése...");
      if (!custodyAddress || !ethers.isAddress(custodyAddress)) {
         console.warn(`Érvénytelen wallet cím a nyereményküldéshez: ${custodyAddress}`);
         return res.status(200).json({ message: 'Játék lezárva, de a nyereményt nem lehetett elküldeni érvénytelen cím miatt.' });
      }

      try {
        console.log("A sendPrize segédfüggvény meghívása...");
        const txHash = await sendPrize(custodyAddress);
        console.log("A sendPrize függvény sikeresen visszatért a következő hash-sel:", txHash);
        return res.status(200).json({ message: 'Játék lezárva, és a nyeremény elküldve!', transactionHash: txHash });
      } catch(prizeError) {
        console.error("KRITIKUS HIBA a sendPrize függvény végrehajtása közben:", prizeError);
        return res.status(500).json({ error: 'Játék lezárva, de a nyereményküldés sikertelen.' });
      }
    }
    
    console.log("Nem teljesültek a nyereményküldés feltételei (nem győzelem vagy nem ingyenes játék). Normál lezárás.");
    return res.status(200).json({ message: 'Játék sikeresen lezárva.' });

  } catch (error) {
    console.error('KRITIKUS HIBA az adatbázis-művelet során:', error);
    return res.status(500).json({ error: 'Adatbázis-hiba a játék lezárásakor.' });
  }
}