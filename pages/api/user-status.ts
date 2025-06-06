// Fájl helye: pages/api/user-status.ts

import { db } from '@vercel/postgres';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 1. A kérés URL-jéből kiolvassuk a felhasználó FID-jét (pl. /api/user-status?fid=123)
  const fid = req.query.fid as string;

  if (!fid) {
    return res.status(400).json({ error: 'FID is required' });
  }

  try {
    // 2. SQL lekérdezést futtatunk az adatbázisban a @vercel/postgres segítségével.
    // A `${BigInt(fid)}` használata biztonságos, véd az SQL injection ellen.
    const { rows } = await db.sql`
      SELECT has_played_free_game FROM users WHERE fid = ${BigInt(fid)};
    `;
    
    // 3. Ha a felhasználót nem találjuk meg (a lekérdezés 0 sort ad vissza),
    //    akkor ez az első alkalom, hogy látjuk. Létrehozzuk az adatbázisban.
    if (rows.length === 0) {
      await db.sql`
        INSERT INTO users (fid, has_played_free_game) VALUES (${BigInt(fid)}, FALSE);
      `;
      // Mivel új, biztosan nem játszott még, ezért `false`-t küldünk vissza.
      return res.status(200).json({ hasPlayedFreeGame: false });
    }

    // 4. Ha a felhasználó már létezik, visszaadjuk az adatbázisban tárolt értéket.
    return res.status(200).json({ hasPlayedFreeGame: rows[0].has_played_free_game });

  } catch (error) {
    console.error('Hiba a felhasználói állapot ellenőrzésekor:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}