'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';

interface User {
  fid?: number;
  displayName?: string;
  username?: string;
}

interface ChessGameProps {
  onGameConcluded?: (winner?: "user" | "opponent" | "draw") => void;
  user: User | null;
  profileImageUrl: string;
  onNewGameClick: () => void;
}

const opponentNamesPool = [
  "M. Carlsen", "G. Kasparov", "R. Fischer", "J. Polgar", 
  "A. Karpov", "M. Tal", "V. Anand", "H. Nakamura"
];

const humanLikeStatusMessages = [
  "Hmm...", "Thinking...", "Interesting", "My move", 
  "Let me see...", "Okay", "I know this"
];

export default function ChessGame({ onGameConcluded, user, profileImageUrl, onNewGameClick }: ChessGameProps) {
  const [game, setGame] = useState(() => new Chess());
  const [isUserTurn, setIsUserTurn] = useState(true);
  const [gameJustOver, setGameJustOver] = useState(false);
  const [isOpponentThinking, setIsOpponentThinking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [statusText, setStatusText] = useState("Finding opponent...");
  const [opponentName, setOpponentName] = useState("Your Opponent");
  const [boardSize, setBoardSize] = useState(400);

  const lozzaWorkerRef = useRef<Worker | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const updateBoardSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const calculatedSize = Math.min(containerWidth - 40, 660);
        setBoardSize(calculatedSize);
      }
    };
    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => window.removeEventListener('resize', updateBoardSize);
  }, []);

  const selectRandomOpponentName = useCallback(() => {
    return opponentNamesPool[Math.floor(Math.random() * opponentNamesPool.length)];
  }, []);

  const showThinkingStatus = useCallback(() => {
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    const randomStatus = humanLikeStatusMessages[Math.floor(Math.random() * humanLikeStatusMessages.length)];
    setStatusText(`${opponentName}: "${randomStatus}"`);
    statusTimeoutRef.current = setTimeout(() => {
      if (isOpponentThinking) {
        setStatusText(`${opponentName} is thinking...`);
      }
    }, 1500 + Math.random() * 1500);
  }, [opponentName, isOpponentThinking]);

  const initializeWorker = useCallback(() => {
    try {
      const worker = new Worker('/lozza-worker.js');
      lozzaWorkerRef.current = worker;
      worker.onmessage = (event) => {
        const message = event.data;
        if (message.startsWith("bestmove")) {
          setIsOpponentThinking(false);
          clearTimeout(statusTimeoutRef.current!);
          const moveStr = message.split(" ")[1];
          if (moveStr && moveStr !== '(none)') {
            const sourceSquare = moveStr.substring(0, 2) as Square;
            const targetSquare = moveStr.substring(2, 4) as Square;
            const promotion = moveStr.length === 5 ? moveStr[4].toLowerCase() : undefined;
            setGame(prev => {
              if (prev.isGameOver()) return prev;
              const newGame = new Chess(prev.fen());
              const move = { from: sourceSquare, to: targetSquare, promotion: promotion || 'q' };
              try {
                newGame.move(move);
                setIsUserTurn(true);
                setStatusText("Your turn (White)");
                return newGame;
              } catch {
                setIsUserTurn(true);
                setStatusText(`${opponentName} attempted invalid move. Your turn.`);
                return prev;
              }
            });
          }
        }
      };
      worker.onerror = (error) => {
        console.error("Worker error:", error);
        setStatusText("Game engine error");
        setIsOpponentThinking(false);
      };
    } catch (error) {
      console.error("Worker initialization failed:", error);
      setStatusText("Failed to load game engine");
    }
  }, [opponentName]);

  const startConnectionSequence = useCallback((newOpponentName: string, isInitial: boolean) => {
    setIsConnecting(true);
    let countdown = 3;
    setStatusText(isInitial ? `Connecting to ${newOpponentName}... ${countdown}` : `Switching to ${newOpponentName}... ${countdown}`);
    clearInterval(countdownIntervalRef.current!);
    countdownIntervalRef.current = setInterval(() => {
      countdown -= 1;
      if (countdown > 0) {
        setStatusText(isInitial ? `Connecting to ${newOpponentName}... ${countdown}` : `Switching to ${newOpponentName}... ${countdown}`);
      } else {
        clearInterval(countdownIntervalRef.current!);
        setStatusText(`Connected with ${newOpponentName}. Your turn (White).`);
        setIsConnecting(false);
        if (isInitial) {
          initializeWorker();
        } else if (lozzaWorkerRef.current) {
          lozzaWorkerRef.current.postMessage("ucinewgame");
        }
      }
    }, 1000);
  }, [initializeWorker]);

  const makeOpponentMove = useCallback((currentFen: string) => {
    if (game.isGameOver() || !lozzaWorkerRef.current || isOpponentThinking) return;
    setIsOpponentThinking(true);
    showThinkingStatus();
    lozzaWorkerRef.current.postMessage(`position fen ${currentFen}`);
    lozzaWorkerRef.current.postMessage(`go movetime ${Math.round(1500 + Math.random() * 2000)}`);
  }, [game, isOpponentThinking, showThinkingStatus]);

  const onDrop = useCallback((sourceSquare: Square, targetSquare: Square): boolean => {
    const piece = game.get(sourceSquare);
    if (!piece || piece.color !== 'w') {
        return false;
    }
    if (!isUserTurn || game.isGameOver() || gameJustOver || isOpponentThinking || isConnecting) return false;
    const newGame = new Chess(game.fen());
    const movingPiece = newGame.get(sourceSquare);
    let move;
    try {
      if (movingPiece?.type === "p" && ((movingPiece.color === "w" && targetSquare[1] === "8") || (movingPiece.color === "b" && targetSquare[1] === "1"))) {
        move = newGame.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
      } else {
        move = newGame.move({ from: sourceSquare, to: targetSquare });
      }
      if (!move) return false;
      setGame(newGame);
      setIsUserTurn(false);
      if (!newGame.isGameOver()) {
        setTimeout(() => makeOpponentMove(newGame.fen()), 500 + Math.random() * 1000);
      }
      return true;
    } catch {
      return false;
    }
  }, [game, isUserTurn, gameJustOver, isOpponentThinking, isConnecting, makeOpponentMove]);

  useEffect(() => {
    const initialOpponent = selectRandomOpponentName();
    setOpponentName(initialOpponent);
    startConnectionSequence(initialOpponent, true);
    return () => {
      lozzaWorkerRef.current?.terminate();
      clearTimeout(statusTimeoutRef.current!);
      clearInterval(countdownIntervalRef.current!);
    };
  }, [selectRandomOpponentName, startConnectionSequence]);

  useEffect(() => {
    if (game.isGameOver() && !gameJustOver) {
      setGameJustOver(true);
      setIsOpponentThinking(false);
      setIsConnecting(false);
      clearTimeout(statusTimeoutRef.current!);
      clearInterval(countdownIntervalRef.current!);
      let winner: "user" | "opponent" | "draw" = "draw";
      if (game.isCheckmate()) {
        winner = game.turn() === "w" ? "opponent" : "user";
      }
      setStatusText(winner === "user" ? "🎉 Congratulations, you won!" : winner === "opponent" ? `🏆 ${opponentName} wins!` : "🤝 It's a draw!");
      onGameConcluded?.(winner);
    }
  }, [game, gameJustOver, opponentName, onGameConcluded]);
  
  // ÚJ FÜGGVÉNY A FELADÁSHOZ
  const handleResign = () => {
    if (game.isGameOver() || gameJustOver) return; // Ne lehessen többször feladni
    
    setGameJustOver(true); // Játék vége állapot beállítása
    setStatusText(`🏳️ You resigned. ${opponentName} wins!`); // Státusz frissítése
    onGameConcluded?.("opponent"); // Jelzés a szülőnek, hogy az ellenfél nyert
  };

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: '700px', margin: '0 auto', padding: '20px', boxSizing: 'border-box', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '10px 15px', background: "#181c24", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {profileImageUrl ? (<img src={profileImageUrl} alt="Your profile" style={{ width: 40, height: 40, borderRadius: '50%', background: '#222', objectFit: 'cover' }} />) : (<div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ccc' }}>?</div>)}
          <span style={{ color: '#fff', fontWeight: 'bold' }}>{user?.displayName || 'You'}</span>
        </div>
        <span style={{ color: '#aaa', fontWeight: 'bold', margin: '0 10px' }}>VS</span>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: "1.2em", fontWeight: "bold", color: "#fff" }}>{opponentName}</div>
          <div style={{ fontSize: "0.9em", color: "#2fd7ff" }}>Opponent</div>
        </div>
      </div>
      
      <div style={{ marginBottom: "10px", padding: "12px", fontWeight: "bold", color: isOpponentThinking || isConnecting ? "#ffa500" : "#fff", fontStyle: isOpponentThinking || isConnecting ? "italic" : "normal", background: "#181c24", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", height: "65px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {statusText}
      </div>

      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
        <Chessboard
          position={game.fen()}
          onPieceDrop={onDrop}
          arePiecesDraggable={isUserTurn && !game.isGameOver() && !gameJustOver && !isOpponentThinking && !isConnecting}
          boardOrientation="white" boardWidth={boardSize}
          customDarkSquareStyle={{ backgroundColor: '#B58863' }}
          customLightSquareStyle={{ backgroundColor: '#F0D9B5' }}
          customBoardStyle={{ borderRadius: '5px', boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)' }}
        />
      </div>
      
      {/* JAVÍTÁS: A gombok logikája */}
      <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "15px", minHeight: "45px" }}>
        {gameJustOver ? (
          // Ha a játéknak vége, a "New Game" gomb jelenik meg
          <button
            onClick={onNewGameClick}
            style={{ padding: "10px 20px", fontSize: "0.9em", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", transition: "background-color 0.2s", fontWeight: "bold" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#c82333"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#dc3545"; }}>
            New Game
          </button>
        ) : (
          // Amíg a játék tart, a "Resign" gomb látható
          <button
            onClick={handleResign}
            style={{ padding: "10px 20px", fontSize: "0.9em", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", transition: "background-color 0.2s", fontWeight: "bold" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#5a6268"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#6c757d"; }}>
            Resign
          </button>
        )}
      </div>
    </div>
  );
}