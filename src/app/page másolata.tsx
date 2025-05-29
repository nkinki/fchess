// src/app/page.tsx
"use client";
import { NeynarAuthButton, useNeynarContext } from "@neynar/react";
import ChessGame from "./ChessGame"; // Győződj meg róla, hogy a ChessGame.tsx rendben van és exportál egy komponenst
import { useEffect, useState } from "react";

// Ha az ERC20_ABI-t használni akarod a transactionParameters-ben, importáld
// import { ERC20_ABI } from './contracts'; // Ha a contracts.ts-ben van definiálva

export default function Home() {
  const { user, isAuthenticated, signOut, isLoading, error } = useNeynarContext();

  const profileImageUrl =
    (user && (user.pfpUrl || user.pfp_url || user.profileImage || user.profile_image)) || "";

  const [canPlayFree, setCanPlayFree] = useState(true);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [hasTicket, setHasTicket] = useState(false);

  // Új state-ek a Frame tranzakcióhoz
  const [custodyAddress, setCustodyAddress] = useState<string | null>(null); // Felhasználó custody wallet címe
  const [isTxPending, setIsTxPending] = useState(false); // Tranzakció folyamatban van-e
  const [txHash, setTxHash] = useState<string | null>(null); // Tranzakció hash

  useEffect(() => {
    if (user && user.fid) {
      const today = new Date().toISOString().slice(0, 10);
      const freeKey = `farchess-free-${user.fid}`;
      const lastFreeDay = localStorage.getItem(freeKey);
      const alreadyPlayed = lastFreeDay === today;
      setCanPlayFree(!alreadyPlayed);
      setHasPlayedToday(alreadyPlayed);

      // Próbáljuk meg a custody címet is lekérni a user objektumból, ha elérhető
      // Ez a Neynar user objektum struktúrájától függ
      if (user.custodyAddress) { // Vagy user.custody_address, stb.
        setCustodyAddress(user.custodyAddress);
      } else if (Array.isArray(user.verifications) && user.verifications.length > 0) {
        // Gyakran a verifikált címek között van a custody
        // Ez csak egy példa, a pontos mezőnév a Neynar API válaszától függ
        const potentialCustody = user.verifications.find(v => v.protocol === "ethereum"); // vagy hasonló logika
        if (potentialCustody) {
          // setCustodyAddress(potentialCustody.address);
        }
      }
      // Ha a Farcaster Frame-en belül fut a miniapp, a Frame kontextusból kellene kapni
    }
  }, [user]);

  function handleStartFreeGame() {
    if (user && user.fid) {
      const today = new Date().toISOString().slice(0, 10);
      const freeKey = `farchess-free-${user.fid}`;
      localStorage.setItem(freeKey, today);
      setCanPlayFree(false);
      setHasPlayedToday(true);
      setGameStarted(true);
    }
  }

  // EZ AZ ÚJ, API HÍVÁST TARTALMAZÓ FÜGGVÉNY
  async function handleBuyTicket() {
    if (!custodyAddress) {
      // Ha nincs automatikusan custodyAddress, kérjük be a felhasználótól (DEMO CÉLRA)
      const inputAddress = prompt("Kérlek, add meg a Farcaster custody wallet címedet a tranzakcióhoz:");
      if (inputAddress && /^0x[a-fA-F0-9]{40}$/.test(inputAddress)) {
        setCustodyAddress(inputAddress); // Beállítjuk és újra próbáljuk
        // Azonnal nem fog menni, mert a state frissítés aszinkron. Jobb lenne egy külön input mező.
        // Most egyszerűen csak alert-et adunk, ha még mindig nincs.
        alert("Custody cím beállítva. Próbáld újra a vásárlást.");
        return;
      } else {
        alert("Érvénytelen vagy nem megadott custody wallet cím!");
        return;
      }
    }

    setIsTxPending(true);
    setTxHash(null);
    try {
      const resp = await fetch("/api/buy-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        // A userWallet küldése a body-ban opcionális, ha az API-d nem használja
        body: JSON.stringify({ userWallet: custodyAddress }),
      });

      if (!resp.ok) {
        let errorMessage = `API hiba: ${resp.status} ${resp.statusText}`;
        try {
          const errorBody = await resp.text();
          errorMessage += ` - ${errorBody}`;
        } catch (e) { /* Hiba a hibaüzenet olvasásakor */ }
        throw new Error(errorMessage);
      }

      const contentType = resp.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await resp.json(); // Ez a { chainId, target, data, value }
        console.log("Received transaction data from /api/buy-ticket:", data);

        // TODO: Itt kell integrálni a Farcaster Frame-en keresztüli tranzakcióküldést.
        // Ez a rész attól függ, milyen Frame SDK-t vagy könyvtárat használsz.
        // Például a frog FDK `transaction()` válasza közvetlenül használható egy Frame-ben.
        // Ha a miniapp egy Frame-ben fut, a Frame-nek kellene ezt a `data`-t felhasználnia
        // egy `frame-transaction` gombhoz vagy automatikus tranzakcióhoz.

        // Egyelőre szimuláljuk a sikert és azt, hogy a Frame majd kezeli.
        alert(`Tranzakció adatok elkészítve a Frame számára: \nCél: ${data.target}\nCalldata: ${data.data.substring(0,20)}...\nIndítsd el a tranzakciót a Farcaster kliensedben!`);

        // Itt nem állítjuk be a setHasTicket(true)-t automatikusan,
        // mert a tranzakciónak sikeresen meg kell történnie a Frame-en keresztül.
        // A tranzakció sikerességét a backendnek kellene figyelnie (webhook, polling),
        // és azután frissíteni a felhasználó állapotát (pl. egyedi ticket ID-val).
        // Most csak a tx pending állapotot vesszük le.
        // setTxHash("0xMOCK_TX_INITIATED_VIA_FRAME_DATA"); // Ezt a Frame adná vissza, ha lenne.
        setIsTxPending(false);


      } else {
        const textResponse = await resp.text();
        throw new Error("Váratlan válaszformátum az API-tól: " + textResponse);
      }

    } catch (err) {
      console.error("Hiba a handleBuyTicket során:", err);
      alert("Hiba a ticket vásárlásakor: " + (err as Error).message);
      setIsTxPending(false);
    }
  }
  // EDDIG AZ ÚJ FÜGGVÉNY

  const canStartNewGame = canPlayFree || hasTicket;

  function handleStartTicketGame() {
    setHasTicket(false); // Itt feltételezzük, hogy a ticketet "felhasználjuk"
    setGameStarted(true);
  }

  if (isLoading) {
    return (
      <main style={{ maxWidth: 440, margin: "40px auto", textAlign: "center", padding: "20px" }}>
        <h1>Farchess</h1>
        <p>Loading user data from Neynar...</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 440, margin: "40px auto", textAlign: "center", padding: "20px" }}>
      <h1>Farchess</h1>

      {error && ( /* ... error display ... */
        <div style={{ color: 'red', margin: '15px 0', border: '1px solid red', padding: '10px', backgroundColor: '#ffebee' }}>
          <p><strong>Neynar Authentication Error:</strong></p>
          <p>{error.message || JSON.stringify(error)}</p>
          <p style={{marginTop: '10px', fontSize: '0.9em'}}>Kérlek próbáld meg frissíteni az oldalt, vagy jelentkezz ki és be újra, ha a probléma továbbra is fennáll.</p>
        </div>
      )}

      {!isAuthenticated && ( /* ... not authenticated ... */
        <>
          <p style={{ marginBottom: "15px" }}>Kérlek jelentkezz be a játékhoz:</p>
          <NeynarAuthButton label="Sign in with Farcaster" />
          <p style={{ marginTop: '20px', fontStyle: 'italic', color: '#777' }}>
            A játék megkezdéséhez jelentkezz be Farcaster fiókoddal.
          </p>
        </>
      )}

      {isAuthenticated && user && (
        <>
          {/* ... user profile display ... */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center',
              margin: '22px 0 10px 0', padding: '6px 12px', borderRadius: '8px',
              background: '#181818', maxWidth: 420, minHeight: 36, overflow: 'visible',
              whiteSpace: 'nowrap', zIndex: 2, position: "relative"
            }}
          >
            {profileImageUrl && ( <img src={profileImageUrl} alt="Profilkép" style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid #333", background: "#222", objectFit: "cover", flexShrink: 0 }} /> )}
            {!profileImageUrl && ( <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#222", display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: "1.3em", border: "1px solid #333", flexShrink: 0 }} >?</div> )}
            <span style={{ fontWeight: 600, fontSize: "1em", color: "#fff" }}> {user.displayName || user.username || `FID: ${user.fid || 'N/A'}`} </span>
            <span style={{ color: "#aaa", fontSize: "0.95em" }}>FID: {user.fid}</span>
          </div>

          {/* Custody wallet cím megadása (DEMO) */}
          {!custodyAddress && (
            <div style={{ margin: "15px 0", padding: "10px", background: "#282828", borderRadius: "6px" }}>
              <label htmlFor="custodyAddr" style={{ display: "block", marginBottom: "5px", color: "#ccc" }}>
                Farcaster Custody Wallet Címed (a ticket vásárláshoz):
              </label>
              <input
                id="custodyAddr"
                type="text"
                placeholder="0x123..."
                onChange={e => setCustodyAddress(e.target.value)}
                style={{ width: "90%", padding: "8px", borderRadius: "4px", border: "1px solid #444", background: "#333", color: "#fff" }}
              />
               <p style={{ color: "#888", fontSize: "0.8em", marginTop: "5px" }}>
                Ezt a címet a Frame automatikusan biztosítaná. Itt most manuálisan kell megadnod.
              </p>
            </div>
          )}
          {custodyAddress && <p style={{fontSize: "0.9em", color: "#777"}}>Custody cím: {custodyAddress.substring(0,6)}...{custodyAddress.substring(custodyAddress.length-4)}</p>}


          {!gameStarted && canPlayFree && ( /* ... free game button ... */
            <div style={{ margin: "20px 0" }}>
              <button onClick={handleStartFreeGame} style={{ padding: "10px 24px", fontSize: "1.1em", background: "#fff", color: "#181818", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }} >
                Ingyenes játszma indítása (napi 1)
              </button>
              <p style={{ color: "#aaa", marginTop: 10 }}>Minden nap egy ingyenes játszma!</p>
            </div>
          )}

          {(gameStarted || canPlayFree || hasTicket) && (
            <>
              {/* ... new game / new game from ticket buttons ... */}
              <div style={{ margin: "10px 0" }}>
                {/* A "gameStarted" állapotot kellene a ChessGame komponensből visszajelezni, hogy elrejtsük ezeket, ha már fut egy játék */}
                {!gameStarted && canPlayFree && (
                  <button onClick={() => { setGameStarted(false); handleStartFreeGame(); /* Vagy csak egy reset logika */ }} style={{ padding: "6px 16px", fontSize: "1em", background: "#222", color: "#fff", border: "1px solid #444", borderRadius: "4px", cursor: "pointer", marginBottom: "10px" }} >
                    Új Ingyenes Játék
                  </button>
                )}
                {!gameStarted && hasTicket && (
                  <button onClick={handleStartTicketGame} style={{ padding: "6px 16px", fontSize: "1em", background: "#1976d2", color: "#fff", border: "1px solid #1976d2", borderRadius: "4px", cursor: "pointer", marginBottom: "10px", marginLeft: "10px" }} >
                    Új Játék Ticketből
                  </button>
                )}
              </div>
              {gameStarted && <ChessGame key={gameStarted ? 'game_active' : 'no_game'} />}
              {/* A `key` prop segít a ChessGame újrarenderelésében/resetelésében, ha a gameStarted változik */}
              {/* Jobb lenne egy onGameEnd callback a ChessGame-ből, ami a gameStarted-et false-ra állítja */}
            </>
          )}

          {(!gameStarted && !canPlayFree && !hasTicket) && (
            <div style={{ color: "#ffb300", margin: "30px 0" }}>
              Ma már lejátszottad az ingyenes játszmádat, és nincs vásárolt ticketed.<br />
              <button
                onClick={handleBuyTicket}
                disabled={!custodyAddress || isTxPending} // Letiltjuk, ha nincs cím vagy folyamatban van
                style={{
                  marginTop: "16px", padding: "10px 24px", fontSize: "1.1em",
                  background: "#1976d2", color: "#fff", border: "none",
                  borderRadius: "6px", fontWeight: "bold", cursor: "pointer",
                  opacity: (!custodyAddress || isTxPending) ? 0.6 : 1
                }}
              >
                {isTxPending ? "Tranzakció előkészítése..." : "Ticket vásárlása ($CHESS)"}
              </button>
              {txHash && <div style={{ color: "#1976d2", marginTop: 8, fontSize: '0.9em' }}>Tranzakció hash (mock): <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer">{txHash.slice(0,10)}...</a></div>}
              {isTxPending && <p style={{color: "#aaa", marginTop: "5px", fontSize: "0.9em"}}>Amint az API válaszol, a Farcaster kliensedben tudod majd jóváhagyni a tranzakciót.</p>}
            </div>
          )}
        </>
      )}

      {isAuthenticated && !user && !isLoading && ( /* ... authenticated but no user data ... */
        <div style={{ marginTop: '20px', fontStyle: 'italic', color: 'orange', border: '1px solid orange', padding: '10px', backgroundColor: '#fff3e0' }}>
          <p>Authenticated, but user data is not available or incomplete.</p>
          <p>This might be a temporary issue. Try refreshing the page.</p>
        </div>
      )}
    </main>
  );
}