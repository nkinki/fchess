// Fájl helye: pages/api/user-status.ts

import { db } from '@vercel/postgres';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const fid = req.query.fid as string;

  if (!fid) {
    return res.status(400).json({ error: 'FID is required' });
  }

  try {
    // JAVÍTÁS: BigInt(fid) helyett String(fid)-et használunk a típuskompatibilitás miatt.
    const { rows } = await db.sql`
      SELECT has_played_free_game FROM users WHERE fid = ${String(fid)};
    `;
    
    if (rows.length === 0) {
      // JAVÍTÁS: Itt is String(fid)-et használunk, amikor új felhasználót hozunk létre.
      await db.sql`
        INSERT INTO users (fid, has_played_free_game) VALUES (${String(fid)}, FALSE);
      `;
      return res.status(200).json({ hasPlayedFreeGame: false });
    }

    return res.status(200).json({ hasPlayedFreeGame: rows[0].has_played_free_game });

  } catch (error) {
    console.error('Hiba a felhasználói állapot ellenőrzésekor:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}