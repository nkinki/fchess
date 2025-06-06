"use client";

import { NeynarAuthButton, useNeynarContext } from "@neynar/react";
import ChessGame from "./ChessGame";
import { useEffect, useState } from "react";

interface User {
  fid?: number;
  pfpUrl?: string;
  pfp_url?: string;
  profileImage?: string;
  profile_image?: string;
  displayName?: string;
  username?: string;
  custodyAddress?: string;
  verifications?: string[];
}

export default function Home() {
  const { user: neynarUserContextData, isAuthenticated } = useNeynarContext();
  const user = neynarUserContextData as User | null;

  const [isNeynarContextLoading, setIsNeynarContextLoading] = useState(true);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [custodyAddress, setCustodyAddress] = useState<string | null>(null);

  const [hasPlayedFreeGame, setHasPlayedFreeGame] = useState(true);
  const [isStatusLoading, setIsStatusLoading] = useState(true);

  useEffect(() => {
    if (typeof isAuthenticated === 'boolean') {
      setIsNeynarContextLoading(false);
    }
    if (user && user.fid) {
      setProfileImageUrl((user.pfpUrl || user.pfp_url || user.profileImage || user.profile_image) || "");
      const initialAddress = user.custodyAddress || (Array.isArray(user.verifications) ? user.verifications.find(v => v.startsWith("0x") && v.length === 42) : null) || "";
      setCustodyAddress(initialAddress);
    } else if (!isAuthenticated && !isNeynarContextLoading) {
      setProfileImageUrl("");
      setCustodyAddress(null);
      if (gameStarted) {
        setGameStarted(false);
      }
    }
  }, [user, isAuthenticated, isNeynarContextLoading, gameStarted]);

  useEffect(() => {
    if (isAuthenticated && user?.fid) {
      setIsStatusLoading(true);
      fetch(`/api/user-status?fid=${user.fid}`)
        .then(res => res.json())
        .then(data => {
          if (data.hasPlayedFreeGame !== undefined) {
            setHasPlayedFreeGame(data.hasPlayedFreeGame);
          }
        })
        .catch(error => console.error("Failed to fetch user status:", error))
        .finally(() => setIsStatusLoading(false));
    }
  }, [isAuthenticated, user]);

  function handleStartGame() {
    if (hasPlayedFreeGame) {
      alert("A következő játék fizetős lesz, ez a funkció még fejlesztés alatt áll.");
    } else {
      setGameStarted(true);
    }
  }

  async function handleOptionalGameEndLogic(winner?: "user" | "opponent" | "draw") {
    console.log("Game concluded on page.tsx. Winner:", winner);
    if (!user?.fid) return;
    try {
      await fetch('/api/conclude-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: user.fid,
          winner: winner,
          wasFreeGame: !hasPlayedFreeGame,
          custodyAddress: custodyAddress
        }),
      });
      setHasPlayedFreeGame(true);
    } catch (error) {
      console.error("Failed to save game conclusion:", error);
    }
  }

  // Ez az új függvény, ami kezeli a "New Game" gombot
  function handleNewGameRequest() {
    setGameStarted(false);
  }

  if (isNeynarContextLoading) {
    return (
      <main style={{ maxWidth: 700, margin: "20px auto", textAlign: "center", padding: "20px" }}>
        <h1>FARCHESS</h1>
        <p>Felhasználói adatok töltése...</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 700, margin: "10px auto", textAlign: "center", padding: "10px", fontFamily: "var(--font-geist-sans), 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      {!isAuthenticated && (
        <div style={{padding:"15px", background:'transparent'}}>
          <p style={{ marginBottom: "15px" }}>A játékhoz jelentkezz be:</p>
          <NeynarAuthButton label="Bejelentkezés Farcasterrel" />
        </div>
      )}

      {isAuthenticated && user && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", background: "#181818", border: "2px solid #444", borderRadius: "14px", boxShadow: "0 2px 12px #0004", padding: "12px 20px", margin: "15px auto", width: "fit-content", minWidth: 240, justifyContent: "center" }}>
            {profileImageUrl && (<img src={profileImageUrl} alt="Profilkép" style={{ width: 44, height: 44, borderRadius: "50%", border: "2.5px solid #888", background: "#222", objectFit: "cover", boxShadow: "0 1px 6px #0002" }}/>)}
            <span style={{ fontWeight: 600, color: "#fff", fontSize: "1.13em" }}>
              {user.displayName || user.username}
              <span style={{ color: "#aaa", fontWeight: 400, marginLeft: 10, fontSize: "0.98em" }}>(FID: {user.fid})</span>
            </span>
          </div>
          
          {!gameStarted && (
            <>
              <div style={{ margin: "10px 0", padding:"10px", border:"1px solid #555", borderRadius:"5px", background:'transparent' }}>
                <label htmlFor="custodyAddr" style={{display:"block", marginBottom:"5px"}}>Wallet cím a nyereményhez:</label>
                <input id="custodyAddr" type="text" placeholder="0x..." value={custodyAddress || ""} onChange={e => setCustodyAddress(e.target.value)} style={{width:"90%", padding:"8px", borderRadius:"4px", border:"1px solid #777", background:"#222", color:"#eee"}} />
              </div>

              <div style={{marginTop:"5px"}}>
                {isStatusLoading ? (
                  <button style={{ padding: "10px 20px", fontSize: "1em", background: "#555", color: "white", border:"none", borderRadius:"5px", cursor:"not-allowed" }}>Státusz ellenőrzése...</button>
                ) : (
                  <button onClick={handleStartGame} style={{ padding: "10px 20px", fontSize: "1em", background: hasPlayedFreeGame ? "#ff8c00" : "green", color: "white", border:"none", borderRadius:"5px", cursor:"pointer" }}>
                    {hasPlayedFreeGame ? "Játék 10 $CHESS-ért" : "Ingyenes játék indítása"}
                  </button>
                )}
              </div>
            </>
          )}
          
          {gameStarted && 
            <ChessGame 
              onGameConcluded={handleOptionalGameEndLogic} 
              user={user} 
              profileImageUrl={profileImageUrl}
              onNewGameClick={handleNewGameRequest} // Itt adjuk át a függvényt
            />}
        </>
      )}
    </main>
  );
}