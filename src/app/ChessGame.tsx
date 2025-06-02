// src/app/ChessGame.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { sdk } from "@farcaster/frame-sdk";

interface ChessGameProps {
  onGameConcluded?: (winner?: "user" | "opponent" | "draw") => void;
}

const CHESS_CONTRACT = "0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07";
const ETH_BASE = "eip155:8453/slip44:60";
const CHESS_BASE = `eip155:8453/erc20:${CHESS_CONTRACT}`;

const opponentNamesPool = [
  "M. Carlsen", "G. Kasparov", "R. Fischer", "J. Polgar", "A. Karpov", "M. Tal",
  "V. Anand", "V. Kramnik", "W. So", "H. Nakamura", "F. Caruana", "Ding L.",
  "A. Firouzja", "MVL", "L. Aronian", "Nepo", "A. Grischuk", "T. Petrosian",
  "B. Spassky", "V. Topalov", "Hou Y.", "A. Kosteniuk", "S. Polgar", "N. Gaprindashvili",
  "Player One", "ChallengerX", "Strategist", "The Thinker", "Rival007"
];

const humanLikeStatusMessages = [
  "Hmm...", "Thinking.", "Interesting.", "My move.", "Contemplating...", "Okay...",
];

export default function ChessGame({ onGameConcluded }: ChessGameProps) {
  const [game, setGame] = useState(new Chess());
  const [isUserTurn, setIsUserTurn] = useState(true);
  const [gameJustOver, setGameJustOver] = useState(false);
  const [isOpponentThinking, setIsOpponentThinking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string>("Finding opponent...");
  const [opponentName, setOpponentName] = useState<string>("Your Opponent");

  const lozzaWorkerRef = useRef<Worker | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const selectRandomOpponentName = () => {
    const randomIndex = Math.floor(Math.random() * opponentNamesPool.length);
    return opponentNamesPool[randomIndex];
  };

  const showThinkingStatus = () => {
    if (gameJustOver) return; // Ne jelenjen meg, ha vége a játéknak
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    const randomHumanStatus = humanLikeStatusMessages[Math.floor(Math.random() * humanLikeStatusMessages.length)];
    setStatus(`${opponentName}: "${randomHumanStatus}"`);

    statusTimeoutRef.current = setTimeout(() => {
      if (isOpponentThinking && !gameJustOver) {
        setStatus(`${opponentName} is thinking...`);
      }
    }, 1500 + Math.random() * 1500);
  };

  const startConnectionSequence = (newOpponentName: string, isInitialConnection: boolean) => {
    let countdown = 6; // Visszaszámlálás 6-ról
    const messagePrefix = isInitialConnection ? `Connecting to ${newOpponentName}` : `Switching to ${newOpponentName}`;
    
    setGameJustOver(false); // Új játék kezdődik, nem "épp most ért véget"
    setIsUserTurn(true);    // Felhasználó kezd
    setIsOpponentThinking(false); // Ellenfél nem gondolkodik az elején
    setGame(new Chess()); // Új, tiszta játékállapot
    setOpponentName(newOpponentName); // Azonnal beállítjuk az új ellenfél nevét
    setStatus(`${messagePrefix}... ${countdown}`);


    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      countdown -= 1;
      if (countdown > 0) {
        setStatus(`${messagePrefix}... ${countdown}`);
      } else {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        // Az opponentName már be van állítva a startConnectionSequence hívásakor
        setStatus(`Game started vs ${newOpponentName}. Your turn (White).`);
        
        if (isInitialConnection) {
          initializeWorker(newOpponentName);
        } else {
            if (lozzaWorkerRef.current) {
                lozzaWorkerRef.current.postMessage("ucinewgame");
                lozzaWorkerRef.current.postMessage("isready");
            }
        }
      }
    }, 1000);
  };
  
  const initializeWorker = (currentOpponentName: string) => {
    try {
        const newWorker = new Worker('/lozza-worker.js');
        lozzaWorkerRef.current = newWorker;
        console.log("[MainThread] Worker created for", currentOpponentName);
  
        newWorker.onmessage = (event: MessageEvent) => {
          const message: string = event.data;
          console.log("[MainThread] Received from worker:", message);
  
          if (message.startsWith("bestmove")) {
            // Csak akkor dolgozzuk fel, ha a játék nem ért véget
            if (game.isGameOver() || gameJustOver) {
                setIsOpponentThinking(false);
                return;
            }

            setIsOpponentThinking(false);
            if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
            const parts = message.split(" ");
            const moveStr = parts[1];
            if (moveStr && moveStr !== '(none)') {
              const sourceSquare = moveStr.substring(0, 2);
              const targetSquare = moveStr.substring(2, 4);
              const promotion = moveStr.length === 5 ? moveStr.substring(4, 5).toLowerCase() : undefined;
  
              setGame((prevGame) => {
                // Dupla ellenőrzés a setGame callbacken belül is
                if (prevGame.isGameOver()) { 
                    return prevGame;
                }
                const g = new Chess(prevGame.fen());
                let opponentMoveAttempt;
                const movingPiece = g.get(sourceSquare);
                if (
                  movingPiece &&
                  movingPiece.type === "p" &&
                  ((movingPiece.color === "w" && targetSquare[1] === "8") ||
                    (movingPiece.color === "b" && targetSquare[1] === "1"))
                ) {
                  opponentMoveAttempt = g.move({ from: sourceSquare, to: targetSquare, promotion: promotion || "q" });
                } else {
                  opponentMoveAttempt = g.move({ from: sourceSquare, to: targetSquare });
                }
  
                if (opponentMoveAttempt) {
                  setIsUserTurn(true);
                  if (!g.isGameOver()) {
                    setStatus("Your turn (White)");
                  }
                  // A játék vége useEffect fogja kezelni a státuszt, ha g.isGameOver()
                  return g;
                } else {
                  console.warn("Opponent failed to make a valid move:", moveStr, "FEN:", g.fen());
                  setIsUserTurn(true);
                  if (!g.isGameOver()){
                    setStatus(`${opponentName} attempted invalid move. Your turn.`);
                  }
                  return prevGame;
                }
              });
            } else {
              setIsUserTurn(true);
              if(!game.isGameOver() && !gameJustOver) { // Csak akkor, ha a játék még tart
                setStatus(`${opponentName} did not provide a move. Your turn.`);
              }
            }
          } else if (message.includes('[LozzaWorker] Worker script initialized and lozza.js loaded.')) {
            console.log("Lozza worker confirmed initialization.");
            if (lozzaWorkerRef.current) {
                lozzaWorkerRef.current.postMessage("uci");
                lozzaWorkerRef.current.postMessage("isready");
            }
          } else if (message === 'readyok') {
              console.log("Engine confirmed ready (readyok).");
          } else if (message.includes('FATAL ERROR') || message.includes('ERROR during importScripts')) {
            console.error("Critical error message from worker:", message);
            setStatus("Game engine failed to load. Please restart.");
            setIsOpponentThinking(false);
            if (lozzaWorkerRef.current) {
              lozzaWorkerRef.current.terminate();
              lozzaWorkerRef.current = null;
            }
          }
        };
  
        newWorker.onerror = (error) => { /* ... (onerror logika) ... */ };
      } catch (e) { /* ... (catch logika) ... */ }
  };

  async function handleSwap() { /* Itt a korábbi swap logika */ }
  function handleCopy() { /* Itt a korábbi copy logika */ }

  useEffect(() => {
    const initialOpponentName = selectRandomOpponentName();
    // setOpponentName(initialOpponentName); // A startConnectionSequence fogja beállítani
    startConnectionSequence(initialOpponentName, true);

    return () => {
      if (lozzaWorkerRef.current) {
        console.log("[MainThread] Terminating worker.");
        lozzaWorkerRef.current.terminate();
        lozzaWorkerRef.current = null;
      }
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Az ESLint figyelmeztethet, de mount-kor akarjuk ezt futtatni

  useEffect(() => {
    if (game.isGameOver() && !gameJustOver) {
      setGameJustOver(true); // Jelöljük, hogy a játék vége feldolgozva
      setIsOpponentThinking(false);
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      // A countdownIntervalRef-et nem kell itt törölni, mert az a kapcsolódáshoz/újraindításhoz tartozik.
      
      let gameWinner: "user" | "opponent" | "draw" = "draw";
      if (game.isCheckmate()) {
        gameWinner = game.turn() === "w" ? "opponent" : "user";
      } else if (
        game.isDraw() || game.isStalemate() || game.isThreefoldRepetition() || game.isInsufficientMaterial()
      ) {
        gameWinner = "draw";
      }

      if (gameWinner === "user") {
        setStatus("Congratulations, you won! Play again?");
      } else if (gameWinner === "opponent") {
        setStatus(`Game over, ${opponentName} wins! Try again?`);
      } else {
        setStatus("It's a draw! Rematch?");
      }

      if (typeof onGameConcluded === "function") {
        onGameConcluded(gameWinner);
      }
    }
  // gameJustOver kivéve a függőségi listából, hogy ne okozzon végtelen ciklust.
  // Csak akkor fusson, ha a `game` állapota változik `isGameOver`-ra.
  }, [game, onGameConcluded, opponentName]);

  function makeOpponentMove(currentFen: string) {
    if (game.isGameOver() || gameJustOver || !lozzaWorkerRef.current || isOpponentThinking) return;
    setIsOpponentThinking(true);
    showThinkingStatus();
    
    if (lozzaWorkerRef.current) {
        lozzaWorkerRef.current.postMessage(`position fen ${currentFen}`);
        const thinkingTime = 1500 + Math.random() * 2000;
        lozzaWorkerRef.current.postMessage(`go movetime ${Math.round(thinkingTime)}`);
    } else { /* ... */ }
  }

  function onDrop(sourceSquare: string, targetSquare: string) {
    if (!isUserTurn || game.isGameOver() || gameJustOver || isOpponentThinking) return false;
    
    const g = new Chess(game.fen());
    let moveAttempt;
    // ... (lépés logika)
    const movingPiece = g.get(sourceSquare);
    if (
      movingPiece && movingPiece.type === "p" &&
      ((movingPiece.color === "w" && targetSquare[1] === "8") || (movingPiece.color === "b" && targetSquare[1] === "1"))
    ) {
      moveAttempt = g.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    } else {
      moveAttempt = g.move({ from: sourceSquare, to: targetSquare });
    }

    if (moveAttempt === null) return false;
    setGame(g);

    if (g.isGameOver()) {
      setIsUserTurn(false);
      // A játék vége useEffect fogja beállítani a státuszt
      return true;
    }

    setIsUserTurn(false);
    const delayBeforeOpponentMove = 500 + Math.random() * 1000;
    setTimeout(() => {
        if (!g.isGameOver() && !gameJustOver) { // Ellenőrizzük a gameJustOver-t is
             makeOpponentMove(g.fen());
        }
    }, delayBeforeOpponentMove);
    return true;
  }

  function handleRestartGame() {
    if (lozzaWorkerRef.current) {
        lozzaWorkerRef.current.postMessage("stop");
    }
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    // Az állapotokat a startConnectionSequence fogja beállítani
    const newOpponentName = selectRandomOpponentName();
    startConnectionSequence(newOpponentName, false);
  }

  function getCurrentStatusText() {
    return status;
  }

  return (
    <div style={{ width: "400px", margin: "auto", marginTop: "20px" }}>
      {/* Presale és Token JSX */}
      <div
        style={{
          marginBottom: "18px",
          minHeight: "36px",
          fontWeight: "bold",
          fontSize: "1.15em",
          color: "#fff",
          textAlign: "center",
          background: "#181c24",
          borderRadius: "7px",
          padding: "12px 8px 8px 8px",
          letterSpacing: "0.02em",
          boxShadow: "0 2px 12px #0002",
          userSelect: "none"
        }}
      >
        <span
          style={{ color: "#fff", fontWeight: 700, cursor: "pointer" }}
          onClick={handleSwap}
          title="Swap ETH for $CHESS token"
        >
          Presale
        </span>{" "}
        <span
          style={{
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer"
          }}
          onClick={handleSwap}
          title="Swap ETH for $CHESS token"
        >
          $CHESS token
        </span>
        <br />
        <span style={{ color: "#2fd7ff", fontWeight: 600, fontSize: "1.02em" }}>
          Play chess, win money!
        </span>
        <br />
        <span
          onClick={handleCopy}
          style={{
            display: "inline-block",
            marginTop: 7,
            fontSize: "0.72em",
            color: "#b5e0ff",
            background: "#23293a",
            padding: "2px 8px",
            borderRadius: "6px",
            cursor: "pointer",
            border: "1px dashed #2fd7ff",
            transition: "background 0.2s"
          }}
          title="Copy contract address"
        >
          {copied ? "Copied!" : CHESS_CONTRACT}
        </span>
      </div>
      
      {/* "Playing against" sort eltávolítottuk */}
      <div
        style={{
          marginBottom: "10px",
          minHeight: "20px",
          fontWeight: "bold",
          fontStyle: isOpponentThinking && !gameJustOver ? "italic" : "normal",
          textAlign: "center"
        }}
      >
        {getCurrentStatusText()}
      </div>
      <Chessboard
        position={game.fen()}
        onPieceDrop={onDrop}
        arePiecesDraggable={
          isUserTurn && !game.isGameOver() && !gameJustOver && !isOpponentThinking
        }
        boardOrientation="white"
        customDarkSquareStyle={{ backgroundColor: "#B58863" }}
        customLightSquareStyle={{ backgroundColor: "#F0D9B5" }}
      />
      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <button
          onClick={handleRestartGame}
          style={{
            padding: "10px 20px",
            fontSize: "1em",
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          {gameJustOver ? "Play New Game" : "Restart Game"}
        </button>
      </div>
    </div>
  );
}