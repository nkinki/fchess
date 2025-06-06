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

  useEffect(() => {
    if (typeof isAuthenticated === 'boolean') {
      setIsNeynarContextLoading(false);
    }

    if (user && user.fid) {
      setProfileImageUrl((user.pfpUrl || user.pfp_url || user.profileImage || user.profile_image) || "");
      
      if (user.custodyAddress) {
        setCustodyAddress(user.custodyAddress);
      } else if (Array.isArray(user.verifications) && user.verifications.length > 0) {
        const ethAddress = user.verifications.find(v => v.startsWith("0x") && v.length === 42);
        if (ethAddress && !custodyAddress) {
          // setCustodyAddress(ethAddress);
        }
      }
    } else if (!isAuthenticated && !isNeynarContextLoading) {
      setProfileImageUrl("");
      setCustodyAddress(null);
      if (gameStarted) {
        setGameStarted(false);
      }
    }
  }, [user, isAuthenticated, isNeynarContextLoading, custodyAddress, gameStarted]);

  function handleStartGame() {
    if (user && user.fid) {
      setGameStarted(true);
    }
  }

  function handleOptionalGameEndLogic(winner?: "user" | "opponent" | "draw") {
    console.log("Game concluded on page.tsx. Winner:", winner);
  }

  if (isNeynarContextLoading) {
    return (
      <main style={{ maxWidth: 600, margin: "20px auto", textAlign: "center", padding: "20px" }}>
        <h1>FARCHESS</h1>
        <p>Loading user data...</p>
      </main>
    );
  }

  return (
    <main style={{ 
        maxWidth: 600,
        margin: "10px auto", 
        textAlign: "center", 
        padding: "10px", 
        fontFamily: "var(--font-geist-sans), 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" 
    }}>
      {/* FARCHESS h1 tag removed */}

      {!isAuthenticated && (
        <div style={{padding:"15px", background:'transparent'}}>
          <p style={{ marginBottom: "15px" }}>Please sign in to play:</p>
          <NeynarAuthButton label="Sign in with Farcaster" />
        </div>
      )}

      {isAuthenticated && user && (
        <>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            background: "#181818",
            border: "2px solid #444",
            borderRadius: "14px",
            boxShadow: "0 2px 12px #0004",
            padding: "12px 20px",
            margin: "15px auto",
            width: "fit-content",
            minWidth: 240,
            justifyContent: "center"
          }}>
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt="Profile Picture"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: "2.5px solid #888",
                  background: "#222",
                  objectFit: "cover",
                  boxShadow: "0 1px 6px #0002"
                }}
              />
            ) : (
              <div style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#ccc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2.5px solid #888"
              }}>?</div>
            )}
            <span style={{ fontWeight: 600, color: "#fff", fontSize: "1.13em" }}>
              {user.displayName || user.username}
              <span style={{ color: "#aaa", fontWeight: 400, marginLeft: 10, fontSize: "0.98em" }}>
                (FID: {user.fid})
              </span>
            </span>
          </div>
          
          {!gameStarted && (
            <div style={{ margin: "10px 0", padding:"10px", border:"1px solid #555", borderRadius:"5px", background:'transparent' }}>
              <label htmlFor="custodyAddr" style={{display:"block", marginBottom:"5px"}}>Custody Wallet Address (optional):</label>
              <input
                  id="custodyAddr"
                  type="text"
                  placeholder="0x..."
                  value={custodyAddress || ""}
                  onChange={e => setCustodyAddress(e.target.value)}
                  style={{width:"90%", padding:"8px", borderRadius:"4px", border:"1px solid #777", background:"#222", color:"#eee"}}
              />
            </div>
          )}

          {!gameStarted && (
            <div style={{marginTop:"5px"}}> 
                <button onClick={handleStartGame} style={{ padding: "10px 20px", fontSize: "1em", background: "green", color: "white", border:"none", borderRadius:"5px", cursor:"pointer", marginRight:"10px" }}>
                  Start Game
                </button>
            </div>
          )}
          
          {gameStarted && <ChessGame onGameConcluded={handleOptionalGameEndLogic} />} 
        </>
      )}
    </main>
  );
}