// src/app/page.tsx
"use client";
import { NeynarAuthButton, useNeynarContext } from "@neynar/react";
import ChessGame from "./ChessGame";
import { useEffect, useState, useCallback } from "react";

export default function Home() {
  const { user, isAuthenticated, isLoading, error } = useNeynarContext();

  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [canPlayFree, setCanPlayFree] = useState(true);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [hasTicket, setHasTicket] = useState(false);

  const [custodyAddress, setCustodyAddress] = useState<string | null>(null);
  const [isTxPending, setIsTxPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [frameTxError, setFrameTxError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfileImageUrl((user.pfpUrl || user.pfp_url || user.profileImage || user.profile_image) || "");
      if (user.fid) {
        const today = new Date().toISOString().slice(0, 10);
        const freeKey = `farchess-free-${user.fid}`;
        const lastFreeDay = localStorage.getItem(freeKey);
        const alreadyPlayed = lastFreeDay === today;
        setCanPlayFree(!alreadyPlayed);
        setHasPlayedToday(alreadyPlayed);
      }
      const potentialCustody = (user as any).custody_address || 
                             (Array.isArray(user.verifications) && user.verifications.find(v => typeof v === 'string' && v.startsWith("0x") && v.length === 42));
      if (potentialCustody && !custodyAddress) {
        // setCustodyAddress(potentialCustody); // Óvatosan ezzel
      }
    }
  }, [user, custodyAddress]);

  // =======================================================================
  // ====> ITT VAN A handleStartFreeGame FÜGGVÉNY DEFINÍCIÓJA <====
  // =======================================================================
  function handleStartFreeGame() {
    if (user && user.fid) {
      const today = new Date().toISOString().slice(0, 10);
      const freeKey = `farchess-free-${user.fid}`;
      localStorage.setItem(freeKey, today);
      setCanPlayFree(false);
      setHasPlayedToday(true);
      setGameStarted(true);
      setTxHash(null); 
      setFrameTxError(null);
    }
  }
  // =======================================================================
  // =======================================================================

  const handleFrameMessage = useCallback((event: MessageEvent) => {
    console.log("Message received from parent Frame:", event.data);
    const frameData = event.data;

    if (frameData && frameData.type === 'frame:transaction_response') {
      setIsTxPending(false);
      if (frameData.success && frameData.hash) {
        setTxHash(frameData.hash);
        setHasTicket(true); 
        alert(`Tranzakció sikeresen elküldve! Hash: ${frameData.hash}. Van egy ticketed.`);
      } else {
        const errorMessage = frameData.error || "Ismeretlen hiba a Frame tranzakció során.";
        setFrameTxError(errorMessage);
        alert(`Tranzakció sikertelen a Frame-ben: ${errorMessage}`);
      }
    }

    if (frameData && frameData.type === 'frame:context' && frameData.custodyAddress) {
        if (!custodyAddress) {
            setCustodyAddress(frameData.custodyAddress);
            console.log("Custody address received from Frame:", frameData.custodyAddress);
        }
    }
  }, [custodyAddress]);

  useEffect(() => {
    window.addEventListener('message', handleFrameMessage);
    if (parent !== window && parent.postMessage) {
        parent.postMessage({ type: 'frame:app_ready', appUrl: window.location.href }, '*');
    }
    return () => {
      window.removeEventListener('message', handleFrameMessage);
    };
  }, [handleFrameMessage]);

  async function handleBuyTicket() {
    if (!custodyAddress) {
      alert("A Farcaster custody wallet címed nem ismert. A Frame-nek kellene biztosítania, vagy add meg manuálisan.");
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(custodyAddress)) {
        alert("Érvénytelen Ethereum cím formátum a custody wallethez!");
        return;
    }

    setIsTxPending(true);
    setTxHash(null);
    setFrameTxError(null);
    try {
      const resp = await fetch("/api/buy-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ userWallet: custodyAddress }),
      });

      if (!resp.ok) {
        let errorMessage = `API hiba: ${resp.status} ${resp.statusText}`;
        try { const errorBody = await resp.json(); errorMessage += ` - ${errorBody.errorDetails || JSON.stringify(errorBody)}`; }
        catch (e) { try { const textErrorBody = await resp.text(); errorMessage += ` - ${textErrorBody}`; } catch (e2) {} }
        throw new Error(errorMessage);
      }

      const data = await resp.json();
      console.log("Transaction data for Frame:", data);

      if (parent !== window && parent.postMessage) {
        parent.postMessage({
          type: 'frame:request_transaction',
          transaction: {
            chainId: `eip155:${parseInt(data.chainId, 10)}`,
            method: 'eth_sendTransaction',
            params: [{ to: data.target, data: data.data, value: data.value }],
          }
        }, '*'); 
        alert("Tranzakciós kérés elküldve a Farcaster kliensnek. Hagyd jóvá ott! Várunk a visszajelzésre...");
      } else {
        console.warn("Not running inside a Farcaster Frame or parent.postMessage not available.");
        alert("Csak böngészőben futsz, nincs Farcaster Frame a tranzakció elküldéséhez. Calldata (ellenőrzéshez): " + data.data);
        setIsTxPending(false);
      }
    } catch (err) {
        console.error("Hiba a handleBuyTicket során:", err);
        alert("Hiba a ticket vásárlásakor: " + (err as Error).message);
        setIsTxPending(false);
    }
  }

  function handleStartTicketGame() {
    setHasTicket(false); 
    setGameStarted(true);
    setTxHash(null);
    setFrameTxError(null);
  }
  
  const onGameEnd = () => { 
    setGameStarted(false);
  };


  if (isLoading) {
    return ( <main style={{ maxWidth: 480, margin: "40px auto", textAlign: "center", padding: "20px", fontFamily: "Arial, sans-serif" }}><h1 style={{fontSize: "2em", marginBottom:"20px"}}>Farchess</h1><p style={{fontSize:"1.1em", color: "#555"}}>Felhasználói adatok betöltése...</p></main> );
  }

  return (
    <main style={{ 
        maxWidth: 480, 
        margin: "20px auto", 
        padding: "20px", 
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        color: "var(--foreground)",
        background: "var(--background)"
    }}>
      <h1 style={{
        fontSize: "2.5em", 
        fontWeight: "bold",
        marginBottom: "25px", 
        textAlign: "center",
        color: "#007bff"
      }}>
        Farchess Sakk
      </h1>

      {error && ( 
        <div style={{ 
            color: "#721c24", 
            backgroundColor: "#f8d7da", 
            borderColor: "#f5c6cb", 
            padding: "15px", 
            marginBottom: "20px", 
            border: "1px solid transparent", 
            borderRadius: "8px" 
        }}>
          <p style={{fontWeight: "bold"}}>Neynar Hiba:</p>
          <p>{error.message || JSON.stringify(error)}</p>
        </div> 
      )}
      
      {!isAuthenticated && (
        <div style={{padding: "20px", background: "#f9f9f9", borderRadius: "8px", textAlign:"center", border: "1px solid #eee"}}>
          <p style={{ marginBottom: "20px", fontSize: "1.1em", color: "#333" }}>
            A játékhoz kérlek jelentkezz be Farcaster fiókoddal:
          </p>
          <NeynarAuthButton label="Bejelentkezés Farcasterrel" />
        </div>
      )}

      {isAuthenticated && user && (
        <>
          <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '15px', 
              justifyContent: 'center', 
              margin: '0 auto 25px auto', 
              padding: '12px 18px', 
              borderRadius: '10px', 
              background: "#343a40", 
              color: 'white', 
              maxWidth: "90%",
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
          }}>
            {profileImageUrl && ( 
              <img 
                src={profileImageUrl} 
                alt="Profilkép" 
                style={{ width: 42, height: 42, borderRadius: "50%", border: "2px solid #007bff" }} 
              /> 
            )}
            <div style={{textAlign: 'left'}}>
                <span style={{ fontWeight: "600", fontSize:"1.1em", display: 'block' }}>
                  {user.displayName || user.username || `FID: ${user.fid}`}
                </span>
                <span style={{ fontSize: "0.9em", color: "#adb5bd" }}>
                  (FID: {user.fid})
                </span>
            </div>
          </div>

          <div style={{ 
              margin: "25px 0", 
              padding: "20px", 
              background: "#fff",
              color: "#333",
              borderRadius: "8px", 
              border: "1px solid #dee2e6",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
          }}>
            <label htmlFor="custodyAddr" style={{ display: "block", marginBottom: "10px", fontWeight: "500", fontSize: "1.05em" }}>
              Farcaster Custody Wallet Címed:
            </label>
            <input 
              id="custodyAddr" 
              type="text" 
              placeholder="0x... (Frame adja, vagy add meg manuálisan)" 
              value={custodyAddress || ""} 
              onChange={e => setCustodyAddress(e.target.value)} 
              style={{ 
                width: "calc(100% - 24px)", 
                padding: "12px", 
                borderRadius: "6px", 
                border: "1px solid #ced4da",
                fontSize: "1em",
                marginBottom: "5px"
              }}
            />
            {custodyAddress && 
              <p style={{fontSize: "0.85em", color: "#6c757d", marginTop: "8px"}}>
                Aktuális cím: {custodyAddress.substring(0,6)}...{custodyAddress.substring(custodyAddress.length-4)}
              </p>}
          </div>

          {gameStarted && (
            <ChessGame key={Date.now()} /* onGameEnd={onGameEnd} */ />
          )}

          {!gameStarted && (
            <div style={{marginTop: "30px", display: "flex", flexDirection: "column", gap: "18px" }}>
              {canPlayFree && (
                <button 
                  onClick={handleStartFreeGame} 
                  style={{ 
                    padding: "14px 22px", 
                    fontSize:"1.1em", 
                    background: "#28a745", 
                    color:"white", 
                    border:"none", 
                    borderRadius:"8px", 
                    cursor:"pointer", 
                    fontWeight: "500",
                    boxShadow: "0 3px 6px rgba(0,0,0,0.15)" 
                  }}
                >
                  Ingyenes Játék Indítása (1 / nap)
                </button>
              )}
              {hasTicket && (
                <button 
                  onClick={handleStartTicketGame} 
                  style={{ 
                    padding: "14px 22px", 
                    fontSize:"1.1em", 
                    background: "#17a2b8", 
                    color:"white", 
                    border:"none", 
                    borderRadius:"8px", 
                    cursor:"pointer", 
                    fontWeight: "500",
                    boxShadow: "0 3px 6px rgba(0,0,0,0.15)" 
                  }}
                >
                  Játék Vásárolt Tickettel
                </button>
              )}
            </div>
          )}

          {!gameStarted && !canPlayFree && !hasTicket && (
            <div style={{ 
                padding:"25px", 
                margin: "40px 0", 
                background:"#fff3cd", 
                border:"1px solid #ffeeba", 
                borderRadius:"8px",
                color: "#856408",
                boxShadow: "0 3px 6px rgba(0,0,0,0.1)"
            }}>
              <p style={{fontWeight:"500", marginBottom:"18px", fontSize: "1.1em"}}>
                Nincs több ingyenes játékod mára, és nincs vásárolt ticketed.
              </p>
              <button 
                onClick={handleBuyTicket} 
                disabled={!custodyAddress || isTxPending} 
                style={{ 
                  padding: "14px 26px", 
                  fontSize: "1.15em", 
                  background: "#007bff", 
                  color: "#fff", 
                  border: "none", 
                  borderRadius: "8px", 
                  cursor:"pointer", 
                  fontWeight: "bold",
                  boxShadow: "0 3px 6px rgba(0,0,0,0.15)", 
                  opacity: (!custodyAddress || isTxPending) ? 0.65 : 1 
                }}
              >
                {isTxPending ? "Tranzakció feldolgozása..." : "Ticket Vásárlása (1000 CHESS)"}
              </button>
              {isTxPending && 
                <p style={{color: "#6c757d", marginTop: "12px", fontSize: "0.95em"}}>
                  Kérjük, hagyd jóvá a tranzakciót a Farcaster kliensedben, majd várd meg a visszajelzést.
                </p>}
              {txHash && 
                <div style={{ color: "#155724", backgroundColor:"#d4edda", borderColor:"#c3e6cb", marginTop: 15, padding: "10px", borderRadius:"6px", fontWeight:"500" }}>
                  Sikeres tranzakció! <br /> Hash: <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{color: "#0056b3", textDecoration:"underline"}}>{txHash.slice(0,12)}...{txHash.slice(-8)}</a>
                </div>}
              {frameTxError && 
                <div style={{ color: "#721c24", backgroundColor:"#f8d7da", borderColor:"#f5c6cb", marginTop: 15, padding: "10px", borderRadius:"6px", fontWeight:"500" }}>
                  Tranzakciós hiba: {frameTxError}
                </div>}
            </div>
          )}
        </>
      )}
    </main>
  );
}