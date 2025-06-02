// src/app/ChessGame.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { sdk } from "@farcaster/frame-sdk";

interface ChessGameProps {
  onGameConcluded?: (winner: "user" | "ai" | "draw") => void;
}

const CHESS_CONTRACT = "0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07";
const ETH_BASE = "eip155:8453/slip44:60";
const CHESS_BASE = "eip155:8453/erc20:0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07";

export default function ChessGame({ onGameConcluded }: ChessGameProps) {
  const [game, setGame] = useState(new Chess());
  const [isUserTurn, setIsUserTurn] = useState(true);
  const [gameJustOver, setGameJustOver] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string>("");

  const lozzaWorkerRef = useRef<Worker | null>(null);

  // Farcaster Mini App swap ETH -> $CHESS
  async function handleSwap() {
    try {
      const result = await sdk.actions.swapToken({
        sellToken: ETH_BASE,
        buyToken: CHESS_BASE,
        // sellAmount: undefined, // No prefilled amount!
      });
      if (result && result.success) {
        console.log("Swap successful!", result.swap.transactions);
      } else if (result && !result.success) {
        console.warn("Swap failed or rejected:", result.reason, result.error);
      } else {
        console.warn("Swap was cancelled or not supported in this environment.");
      }
    } catch (err) {
      console.error("Swap error:", err);
    }
  }

  useEffect(() => {
    const worker = new Worker('/lozza-worker.js');
    lozzaWorkerRef.current = worker;

    worker.onmessage = (event: MessageEvent) => {
      const message: string = event.data;

      if (message.startsWith("bestmove")) {
        setIsAIThinking(false);
        const parts = message.split(" ");
        const moveStr = parts[1];
        if (moveStr && moveStr !== '(none)') {
          const sourceSquare = moveStr.substring(0, 2);
          const targetSquare = moveStr.substring(2, 4);
          const promotion = moveStr.length === 5 ? moveStr.substring(4, 5).toLowerCase() : undefined;

          setGame((prevGame) => {
            const g = new Chess(prevGame.fen());
            let aiMoveAttempt;
            const movingPiece = g.get(sourceSquare);
            if (
              movingPiece &&
              movingPiece.type === "p" &&
              ((movingPiece.color === "w" && targetSquare[1] === "8") ||
                (movingPiece.color === "b" && targetSquare[1] === "1"))
            ) {
              aiMoveAttempt = g.move({ from: sourceSquare, to: targetSquare, promotion: promotion || "q" });
            } else {
              aiMoveAttempt = g.move({ from: sourceSquare, to: targetSquare });
            }

            if (aiMoveAttempt) {
              setIsUserTurn(true);
              return g;
            } else {
              setIsUserTurn(true);
              return prevGame;
            }
          });
        } else {
          setIsUserTurn(true);
        }
      }
      // (Other message handling omitted for brevity)
    };

    worker.onerror = () => {
      setIsAIThinking(false);
    };

    lozzaWorkerRef.current.postMessage("uci");

    return () => {
      if (lozzaWorkerRef.current) {
        lozzaWorkerRef.current.terminate();
        lozzaWorkerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (game.isGameOver() && !gameJustOver) {
      setGameJustOver(true);
      setIsAIThinking(false);
      let gameWinner: "user" | "ai" | "draw" = "draw";
      if (game.isCheckmate()) {
        gameWinner = game.turn() === "w" ? "ai" : "user";
      } else if (
        game.isDraw() ||
        game.isStalemate() ||
        game.isThreefoldRepetition() ||
        game.isInsufficientMaterial()
      ) {
        gameWinner = "draw";
      }

      // Üdvözlő/gratulációs státusz
      if (gameWinner === "user") {
        setStatus("Congratulations, you won!");
      } else if (gameWinner === "ai") {
        setStatus("Game over, the AI wins! Good game!");
      } else {
        setStatus("It's a draw!");
      }

      if (typeof onGameConcluded === "function") {
        onGameConcluded(gameWinner);
      }
    }
  }, [game, onGameConcluded, gameJustOver]);

  function makeAIMove(currentFen: string) {
    if (game.isGameOver() || !lozzaWorkerRef.current || isAIThinking) {
      return;
    }
    setIsAIThinking(true);
    lozzaWorkerRef.current.postMessage("ucinewgame");
    lozzaWorkerRef.current.postMessage("isready");
    lozzaWorkerRef.current.postMessage(`position fen ${currentFen}`);
    lozzaWorkerRef.current.postMessage("go movetime 2000");
  }

  function onDrop(sourceSquare: string, targetSquare: string) {
    if (!isUserTurn || game.isGameOver() || gameJustOver || isAIThinking) return false;
    const g = new Chess(game.fen());

    const movingPiece = g.get(sourceSquare);
    let moveAttempt;
    if (
      movingPiece &&
      movingPiece.type === "p" &&
      ((movingPiece.color === "w" && targetSquare[1] === "8") ||
        (movingPiece.color === "b" && targetSquare[1] === "1"))
    ) {
      moveAttempt = g.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    } else {
      moveAttempt = g.move({ from: sourceSquare, to: targetSquare });
    }

    if (moveAttempt === null) return false;
    setGame(g);

    if (g.isGameOver()) {
      setIsUserTurn(false);
      return true;
    }
    setIsUserTurn(false);
    setTimeout(() => {
      if (!g.isGameOver()) makeAIMove(g.fen());
    }, 50);
    return true;
  }

  function handleCopy() {
    navigator.clipboard.writeText(CHESS_CONTRACT);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function getCurrentStatusText() {
    if (gameJustOver) return status;
    if (isAIThinking) return "AI is thinking...";
    return "";
  }

  return (
    <div style={{ width: "400px", margin: "auto", marginTop: "20px" }}>
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
      <div
        style={{
          marginBottom: "10px",
          minHeight: "20px",
          fontWeight: "bold",
          fontStyle: isAIThinking ? "italic" : "normal",
          textAlign: "center"
        }}
      >
        {getCurrentStatusText()}
      </div>
      <Chessboard
        position={game.fen()}
        onPieceDrop={onDrop}
        arePiecesDraggable={
          isUserTurn && !game.isGameOver() && !gameJustOver && !isAIThinking
        }
        boardOrientation="white"
        customDarkSquareStyle={{ backgroundColor: "#B58863" }}
        customLightSquareStyle={{ backgroundColor: "#F0D9B5" }}
      />
    </div>
  );
}
