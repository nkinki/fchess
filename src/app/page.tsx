// src/app/page.tsx
"use client";
import { NeynarAuthButton, useNeynarContext } from "@neynar/react";
import ChessGame from "./ChessGame";
import { useEffect, useState } from "react";
// import Image from "next/image"; // Ideiglenesen kivéve

interface User { // User interface a jobb típuskezeléshez
    fid?: number;
    pfpUrl?: string;
    pfp_url?: string;
    profileImage?: string;
    profile_image?: string;
    displayName?: string;
    username?: string;
    custodyAddress?: string; // Kisbetűs a Neynar SDK szerint
    verifications?: string[];
  }

export default function Home() {
  // JAVÍTÁS ITT: isLoading és error eltávolítva a destrukturálásból
  const { user: neynarUserContextData, isAuthenticated } = useNeynarContext();
  const user = neynarUserContextData as User | null; // Típuskonverzió

  // Új state a Neynar kontextus betöltési állapotának manuális kezelésére
  const [isNeynarContextLoading, setIsNeynarContextLoading] = useState(true);

  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [canPlayFree, setCanPlayFree] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [hasTicket, setHasTicket] = useState(false); 

  const [custodyAddress, setCustodyAddress] = useState<string | null>(null);

  useEffect(() => {
    // Ha az isAuthenticated értéke boolean (tehát nem undefined), akkor a kontextus betöltődött
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
        // Ha nincs bejelentkezve ÉS a context már nem tölt, akkor alaphelyzetbe állítunk
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
        alert("A ticket vásárláshoz a Frame-nek kellene biztosítania a custody wallet címedet, vagy add meg manuálisan (ez a funkció még fejlesztés alatt).");
        return;
    }
    console.log("Ticket vásárlás kezdeményezve a következő címről (szimuláció):", custodyAddress);
    setHasTicket(true); 
    alert("Ticket sikeresen 'megvásárolva' (szimuláció)! Most már játszhatsz vele.");
  }

  function handleStartTicketGame() {
    setHasTicket(false);
    setGameStarted(true);
  }

  // JAVÍTÁS ITT: A manuálisan kezelt isNeynarContextLoading használata
  if (isNeynarContextLoading) {
    return (
      <main style={{ maxWidth: 440, margin: "40px auto", textAlign: "center", padding: "20px" }}>
        <h1>Farchess Sakk</h1>
        <p>Felhasználói adatok betöltése...</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 440, margin: "40px auto", textAlign: "center", padding: "20px", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      <h1 style={{fontSize: "2.2em", fontWeight:"bold", marginBottom:"20px"}}>Farchess Sakk</h1>

      {/* JAVÍTÁS ITT: Az 'error' property-t nem tudjuk itt kiolvasni, ha nincs a context típusában.
          A Neynar hibakezelését a dokumentációjuk alapján kellene implementálni,
          pl. egy ErrorBoundary komponenssel a NeynarProvider körül, ha az támogatott.
      */}
      {/* {error && ( 
        <div style={{ color: 'red', margin: '15px 0', border: '1px solid red', padding: '10px', backgroundColor: '#ffebee', borderRadius:"5px" }}>
          <p><strong>Neynar Hiba:</strong></p>
          <p>{error.message || JSON.stringify(error)}</p>
        </div>
      )} */}

      {!isAuthenticated && (
        <div style={{padding:"15px", background:'transparent'}}> {/* A háttér már transparent volt a te kódodban */}
          <p style={{ marginBottom: "15px" }}>Kérlek jelentkezz be a játékhoz:</p>
          <NeynarAuthButton label="Bejelentkezés Farcasterrel" />
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
              background: 'transparent', // A háttér már transparent volt a te kódodban
              // border:"1px solid #ddd" // A keretet a te kódodban meghagytad, én most is úgy hagyom
            }}>
            {profileImageUrl ? (
              <img 
                src={profileImageUrl}
                alt="Profilkép"
                style={{ width: 40, height: 40, borderRadius: "50%" }}
              />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#ccc", display:"flex", alignItems:"center", justifyContent:"center" }}>?</div>
            )}
            <div>
                <span style={{ fontWeight: 600, display:"block" }}>{user.displayName || user.username}</span>
                {/* A te kódodban a FID színe #ccc volt, ezt meghagyom */}
                <span style={{ fontSize: "0.85em", color: "#ccc" }}>(FID: {user.fid})</span>
            </div>
          </div>
          
          <div style={{ margin: "15px 0", padding:"10px", border:"1px solid #eee", borderRadius:"5px" }}>
            <label htmlFor="custodyAddr" style={{display:"block", marginBottom:"5px"}}>Custody Wallet Cím (opcionális):</label>
            <input
                id="custodyAddr"
                type="text"
                placeholder="0x..."
                value={custodyAddress || ""}
                onChange={e => setCustodyAddress(e.target.value)}
                style={{width:"90%", padding:"8px", borderRadius:"4px", border:"1px solid #ccc"}}
            />
          </div>

          {!gameStarted && (
            <div style={{marginTop:"20px"}}>
                {canPlayFree && (
                    <button onClick={handleStartFreeGame} style={{ padding: "10px 20px", fontSize: "1em", background: "green", color: "white", border:"none", borderRadius:"5px", cursor:"pointer", marginRight:"10px" }}>
                    Ingyenes Játszma
                    </button>
                )}
                {hasTicket && (
                    <button onClick={handleStartTicketGame} style={{ padding: "10px 20px", fontSize: "1em", background: "blue", color: "white", border:"none", borderRadius:"5px", cursor:"pointer"  }}>
                    Játék Tickettel
                    </button>
                )}
            </div>
          )}

          {gameStarted && <ChessGame />}

          {!gameStarted && !canPlayFree && !hasTicket && (
            <div style={{ marginTop: "30px", padding:"15px", background:"#fff8e1", borderRadius:"5px", border:"1px solid #ffecb3" }}>
              <p style={{ color: "#856404", marginBottom:"10px" }}>
                Ma már lejátszottad az ingyenes játszmádat, és nincs ticketted.
              </p>
              <button onClick={handleBuyTicket} style={{ padding: "10px 20px", fontSize: "1em", background: "orange", color: "white", border:"none", borderRadius:"5px", cursor:"pointer" }} >
                Ticket Vásárlása (Szimuláció)
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}