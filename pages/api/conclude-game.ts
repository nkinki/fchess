// Fájl helye: pages/api/conclude-game.ts

import { db } from '@vercel/postgres';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Ez a végpont csak POST kéréseket fogad el.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // A kérés törzséből (body) olvassuk ki az adatokat.
  const { fid, winner, wasFreeGame, custodyAddress } = req.body;

  if (!fid) {
    return res.status(400).json({ error: 'FID is required' });
  }

  try {
    // Egyetlen "okos" SQL paranccsal frissítjük a felhasználót.
    // Az ON CONFLICT ... DO UPDATE biztosítja, hogy ha a felhasználó már létezik,
    // akkor csak frissítjük, ha nem, akkor beszúrjuk.
    await db.sql`
      INSERT INTO users (fid, has_played_free_game, custody_address)
      VALUES (${BigInt(fid)}, TRUE, ${custodyAddress})
      ON CONFLICT (fid) 
      DO UPDATE SET 
        has_played_free_game = TRUE, 
        custody_address = COALESCE(${custodyAddress}, users.custody_address);
    `;

    // Itt jönne a tokenküldés logikája a jövőben.
    if (winner === 'user' && wasFreeGame) {
      console.log(`TODO: Nyeremény küldése a ${fid} FID-jű felhasználónak a ${custodyAddress} címre.`);
    }
    
    return res.status(200).json({ message: 'Game concluded successfully.' });

  } catch (error) {
    console.error('Hiba a játék lezárásakor:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}