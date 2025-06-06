'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';

// A függvény paramétereinek típusait expliciten definiáljuk
interface DraggablePieceArgs {
  piece: string;
  sourceSquare: Square;
}

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

const CHESS_CONTRACT = "0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07";

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
  const [status, setStatus] = useState("Finding opponent...");
  const [opponentName, setOpponentName] = useState("Your Opponent");
  const [copied, setCopied] = useState(false);
  const [boardSize, setBoardSize] = useState(400);

  const lozzaWorkerRef = useRef<Worker | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(CHESS_CONTRACT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

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
    
    const randomStatus = humanLikeStatusMessages[
      Math.floor(Math.random() * humanLikeStatusMessages.length)
    ];
    setStatus(`${opponentName}: "${randomStatus}"`);

    statusTimeoutRef.current = setTimeout(() => {
      if (isOpponentThinking) {
        setStatus(`${opponentName} is thinking...`);
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
              const move = {
                from: sourceSquare, to: targetSquare, promotion: promotion || 'q'
              };
              
              try {
                newGame.move(move);
                setIsUserTurn(true);
                setStatus("Your turn (White)");
                return newGame;
              } catch {
                setIsUserTurn(true);
                setStatus(`${opponentName} attempted invalid move. Your turn.`);
                return prev;
              }
            });
          }
        }
      };
      worker.onerror = (error) => {
        console.error("Worker error:", error);
        setStatus("Game engine error");
        setIsOpponentThinking(false);
      };
    } catch (error) {
      console.error("Worker initialization failed:", error);
      setStatus("Failed to load game engine");
    }
  }, [opponentName]);

  const startConnectionSequence = useCallback((newOpponentName: string, isInitial: boolean) => {
    setIsConnecting(true);
    let countdown = 3;
    setStatus(isInitial ? `Connecting to ${newOpponentName}... ${countdown}` : `Switching to ${newOpponentName}... ${countdown}`);

    clearInterval(countdownIntervalRef.current!);

    countdownIntervalRef.current = setInterval(() => {
      countdown -= 1;
      if (countdown > 0) {
        setStatus(isInitial ? `Connecting to ${newOpponentName}... ${countdown}` : `Switching to ${newOpponentName}... ${countdown}`);
      } else {
        clearInterval(countdownIntervalRef.current!);
        setStatus(`Connected with ${newOpponentName}. Your turn (White).`);
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

  const onDrop = useCallback((sourceSquare: Square, targetSquare: Square) => {
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

      setStatus(winner === "user" ? "🎉 Congratulations, you won!" :
                winner === "opponent" ? `🏆 ${opponentName} wins!` : "🤝 It's a draw!");
      
      onGameConcluded?.(winner);
    }
  }, [game, gameJustOver, opponentName, onGameConcluded]);

  // JAVÍTÁS: A logikát kiemeltük egy különálló függvénybe
  const canDragPiece = ({ piece }: DraggablePieceArgs): boolean => {
    if (!isUserTurn) return false;
    if (game.isGameOver()) return false;
    if (gameJustOver) return false;
    if (isOpponentThinking) return false;
    if (isConnecting) return false;
    if (!piece.startsWith('w')) return false;
    
    return true;
  };

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: '700px', margin: '0 auto', padding: '20px', boxSizing: 'border-box', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      {/* Game Header */}
      <div style={{ marginBottom: "10px", padding: "15px", textAlign: "center", background: "linear-gradient(135deg, #181c24 0%, #232a38 100%)", borderRadius: "10px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", color: "#fff" }}>
        <h2 style={{ margin: "0 0 10px 0", color: "#2fd7ff", fontSize: "1.3em" }}>FarChess</h2>
        <p style={{ margin: "0 0 15px 0", fontSize: "0.9em", opacity: 0.8 }}>Play chess, win $CHESS tokens!</p>
        <div onClick={handleCopy} style={{ display: "inline-block", padding: "6px 12px", fontSize: "0.75em", color: copied ? "#0f0" : "#b5e0ff", background: "#23293a", borderRadius: "20px", cursor: "pointer", border: `1px dashed ${copied ? "#0f0" : "#2fd7ff"}`, transition: "all 0.2s", fontFamily: "monospace" }}>
          {copied ? "✓ Copied!" : `Token: ${CHESS_CONTRACT.slice(0, 6)}...${CHESS_CONTRACT.slice(-4)}`}
        </div>
      </div>

      {/* Matchup Info */}
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
      
      {/* Game Status */}
      <div style={{ marginBottom: "10px", padding: "12px", fontWeight: "bold", color: isOpponentThinking || isConnecting ? "#ffa500" : "#fff", fontStyle: isOpponentThinking || isConnecting ? "italic" : "normal", background: "#181c24", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", height: "65px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {status}
      </div>

      {/* Chessboard */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
        <Chessboard
          position={game.fen()} onPieceDrop={onDrop}
          arePiecesDraggable={canDragPiece} // JAVÍTÁS: Itt adjuk át a különálló függvényt
          boardOrientation="white" boardWidth={boardSize}
          customDarkSquareStyle={{ backgroundColor: '#B58863' }}
          customLightSquareStyle={{ backgroundColor: '#F0D9B5' }}
          customBoardStyle={{ borderRadius: '5px', boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)' }}
        />
      </div>

      {/* Game Controls */}
      <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "15px" }}>
        <button
          onClick={onNewGameClick}
          style={{ padding: "10px 20px", fontSize: "0.9em", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", transition: "background-color 0.2s", fontWeight: "bold" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#c82333"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#dc3545"; }}>
          New Game
        </button>
      </div>
    </div>
  );
}