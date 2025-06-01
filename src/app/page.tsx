// src/app/page.tsx

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
  const [canPlayFree, setCanPlayFree] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [hasTicket, setHasTicket] = useState(false);
  const [custodyAddress, setCustodyAddress] = useState<string | null>(null);

  useEffect(() => {
    if (typeof isAuthenticated === 'boolean') {
      setIsNeynarContextLoading(false);
    }

    if (user && user.fid) {
      setProfileImageUrl((user.pfpUrl || user.pfp_url || user.profileImage || user.profile_image) || "");
      const today = new Date().toISOString().slice(0, 10);
      const freeKey = `farchess-free-${user.fid}`;
      const lastFreeDay = localStorage.getItem(freeKey);
      const alreadyPlayed = lastFreeDay === today;
      setCanPlayFree(!alreadyPlayed);

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
    }
  }, [user, isAuthenticated, isNeynarContextLoading, custodyAddress]);

  function handleStartFreeGame() {
    if (user && user.fid) {
      const today = new Date().toISOString().slice(0, 10);
      const freeKey = `farchess-free-${user.fid}`;
      localStorage.setItem(freeKey, today);
      setCanPlayFree(false);
      setGameStarted(true);
    }
  }

  function handleBuyTicket() {
    if (!custodyAddress) {
      alert("To buy a ticket, your custody wallet address should be provided by the Frame, or enter it manually (this feature is under development).");
      return;
    }
    setHasTicket(true);
    alert("Ticket 'purchased' successfully (simulation)! You can now play with it.");
  }

  function handleStartTicketGame() {
    setHasTicket(false);
    setGameStarted(true);
  }

  if (isNeynarContextLoading) {
    return (
      <main style={{ maxWidth: 440, margin: "40px auto", textAlign: "center", padding: "20px" }}>
        <h1>Farchess Chess</h1>
        <p>Loading user data...</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 440, margin: "40px auto", textAlign: "center", padding: "20px", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      <h1 style={{fontSize: "2.2em", fontWeight:"bold", marginBottom:"20px"}}>Farchess Chess</h1>

      {!isAuthenticated && (
        <div style={{padding:"15px", background:'transparent'}}>
          <p style={{ marginBottom: "15px" }}>Please sign in to play:</p>
          <NeynarAuthButton label="Sign in with Farcaster" />
        </div>
      )}

      {isAuthenticated && user && (
        <>
          <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              justifyContent: 'center', 
              margin: '20px 0', 
              padding: '10px', 
              borderRadius: '8px', 
              background: 'transparent', 
            }}>
            {profileImageUrl ? (
              <img 
                src={profileImageUrl}
                alt="Profile Picture"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  border: "2.5px solid #aaa",
                  boxSizing: "border-box",
                  background: "#222"
                }}
              />
            ) : (
              <div style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "#ccc",
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                border: "2.5px solid #aaa"
              }}>?</div>
            )}
            <div>
                <span style={{ fontWeight: 600, display:"block" }}>{user.displayName || user.username}</span>
                <span style={{ fontSize: "0.85em", color: "#ccc" }}>(FID: {user.fid})</span>
            </div>
          </div>
          
          {/* Custody mező csak játék előtt */}
          {!gameStarted && (
            <div style={{ margin: "15px 0", padding:"10px", border:"1px solid #555", borderRadius:"5px", background:'transparent' }}>
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

          {/* ELLENFÉLVÁLASZTÓ BLOKK ELTÁVOLÍTVA */}

          {/* Játék indító gombok csak játék előtt */}
          {!gameStarted && (
            <div style={{marginTop:"10px"}}> 
                {canPlayFree && (
                    <button onClick={handleStartFreeGame} style={{ padding: "10px 20px", fontSize: "1em", background: "green", color: "white", border:"none", borderRadius:"5px", cursor:"pointer", marginRight:"10px" }}>
                    Free Game
                    </button>
                )}
                {hasTicket && (
                    <button onClick={handleStartTicketGame} style={{ padding: "10px 20px", fontSize: "1em", background: "blue", color: "white", border:"none", borderRadius:"5px", cursor:"pointer"  }}>
                    Play with Ticket
                    </button>
                )}
            </div>
          )}

          {/* ChessGame csak játék közben */}
          {gameStarted && <ChessGame />} 

          {/* Jegyvásárlás csak játék előtt, ha nincs lehetőség játszani */}
          {!gameStarted && !canPlayFree && !hasTicket && (
            <div style={{ marginTop: "30px", padding:"15px", background:"#2a2a2a", borderRadius:"5px", border:"1px solid #444" }}>
              <p style={{ color: "#aaa", marginBottom:"10px" }}>
                You have already played your free game today and you don't have a ticket.
              </p>
              <button onClick={handleBuyTicket} style={{ padding: "10px 20px", fontSize: "1em", background: "#d08c00", color: "white", border:"none", borderRadius:"5px", cursor:"pointer" }} >
                Buy Ticket (Simulation)
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
