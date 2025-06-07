// Fájl helye: pages/api/conclude-game.ts

import { db } from '@vercel/postgres';
import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

// --- ÚJ RÉSZ: KONFIGURÁCIÓ ÉS TOKENKÜLDŐ LOGIKA ---

// 1. KONFIGURÁCIÓS VÁLTOZÓK
// ===================================================================

// A Base hálózat RPC URL-je. Ezen keresztül kommunikálunk a blokklánccal.
const BASE_RPC_URL = 'https://mainnet.base.org';

// A $CHESS token szerződésének címe a Base hálózaton.
const CHESS_TOKEN_ADDRESS = '0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07'; 

// A token-szerződés minimális interfésze (ABI), ami csak a `transfer` függvényt tartalmazza.
const CHESS_TOKEN_ABI = [
  "function transfer(address to, uint256 amount)"
];

// A nyeremény összege. A `ethers.parseUnits("10", 18)` a "10" értéket
// 18 tizedesjeggyel számolja át, ami a legtöbb ERC20 token standardja.
const PRIZE_AMOUNT = ethers.parseUnits("10", 18);


// 2. A TOKENKÜLDŐ SEGÉDFÜGGVÉNY
// ===================================================================

async function sendPrize(recipientAddress: string): Promise<string> {
  // A privát kulcsot biztonságosan a környezeti változókból olvassuk ki.
  const privateKey = process.env.HOT_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    console.error("Hot wallet private key is not configured in Vercel.");
    throw new Error("Szerver konfigurációs hiba: a wallet kulcs hiányzik.");
  }

  // Kapcsolódás a Base hálózathoz az RPC URL-en keresztül.
  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  
  // A "Hot Wallet" objektum létrehozása a privát kulcsból és a providerből.
  const wallet = new ethers.Wallet(privateKey, provider);

  // A token-szerződés objektum létrehozása, amivel hívásokat tudunk indítani.
  const tokenContract = new ethers.Contract(CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI, wallet);

  // A `transfer` tranzakció elküldése.
  console.log(`Nyeremény küldése indul: ${ethers.formatUnits(PRIZE_AMOUNT, 18)} $CHESS a ${recipientAddress} címre...`);
  const tx = await tokenContract.transfer(recipientAddress, PRIZE_AMOUNT);
  
  // Megvárjuk, amíg a tranzakció bekerül egy blokkba (megerősítést kap).
  await tx.wait();

  console.log(`Tranzakció sikeres! Hash: ${tx.hash}`);
  return tx.hash; // Visszaadjuk a tranzakció azonosítóját.
}


// 3. A MEGLÉVŐ API HANDLER BŐVÍTÉSE
// ===================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { fid, winner, wasFreeGame, custodyAddress } = req.body;

  if (!fid) {
    return res.status(400).json({ error: 'FID is required' });
  }

  try {
    // Adatbázis frissítése (ez a rész változatlan)
    await db.sql`
      INSERT INTO users (fid, has_played_free_game, custody_address)
      VALUES (${String(fid)}, TRUE, ${custodyAddress})
      ON CONFLICT (fid) 
      DO UPDATE SET 
        has_played_free_game = TRUE, 
        custody_address = COALESCE(${custodyAddress}, users.custody_address);
    `;

    // A nyereményküldés logikájának meghívása
    if (winner === 'user' && wasFreeGame) {
      if (!custodyAddress || !ethers.isAddress(custodyAddress)) {
         console.log(`A(z) ${fid} FID-jű felhasználó nyert, de érvénytelen vagy üres wallet címet adott meg.`);
         // Itt nem hibát dobunk, mert a játékot sikeresen lezártuk, csak a nyereményt nem tudtuk elküldeni.
         return res.status(200).json({ message: 'Játék lezárva, de a nyereményt nem lehetett elküldeni érvénytelen cím miatt.' });
      }

      try {
        const txHash = await sendPrize(custodyAddress);
        return res.status(200).json({ message: 'Játék lezárva, és a nyeremény elküldve!', transactionHash: txHash });
      } catch(prizeError) {
        console.error(`NYEREMÉNYKÜLDÉS SIKERTELEN a(z) ${fid} FID-jű felhasználónak a ${custodyAddress} címre:`, prizeError);
        return res.status(500).json({ error: 'Játék lezárva, de a nyereményküldés sikertelen.' });
      }
    }
    
    // Ha nem nyert, vagy nem az ingyenes játéka volt, csak simán lezárjuk.
    return res.status(200).json({ message: 'Játék sikeresen lezárva.' });

  } catch (error) {
    console.error('Hiba a játék lezárásakor az adatbázisban:', error);
    return res.status(500).json({ error: 'Adatbázis-hiba a játék lezárásakor.' });
  }
}