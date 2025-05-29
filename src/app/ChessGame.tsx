"use client";
import { useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

// Gép (AI) random lépés logika
function getRandomMove(game: Chess) {
  const moves = game.moves();
  if (moves.length === 0) return null;
  const randomIdx = Math.floor(Math.random() * moves.length);
  return moves[randomIdx];
}

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [isUserTurn, setIsUserTurn] = useState(true); // mindig a felhasználó kezd (fehérrel)
  const [status, setStatus] = useState("");

  // Gép lépése
  function makeAIMove(currentGame: Chess) {
    const move = getRandomMove(currentGame);
    if (move) {
      currentGame.move(move);
      setGame(new Chess(currentGame.fen()));
      setIsUserTurn(true);
    }
  }

  // Lépéskezelő
  function onDrop(sourceSquare: string, targetSquare: string) {
    if (!isUserTurn) return false;
    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });
    if (move === null) return false;

    setGame(new Chess(game.fen()));
    setIsUserTurn(false);

    // Ellenőrizzük, vége van-e a játéknak
    setTimeout(() => {
      const g = new Chess(game.fen());
      if (g.isGameOver()) {
        setStatus("Játék vége!");
        return;
      }
      // Gép lépése
      makeAIMove(g);
      if (g.isGameOver()) {
        setStatus("Játék vége!");
      }
    }, 400); // kis késleltetés, hogy "emberibb" legyen a gép
    return true;
  }

  // Új játék indítása
  function handleRestart() {
    setGame(new Chess());
    setIsUserTurn(true);
    setStatus("");
  }

  // Játékállapot kiírása
  function getStatusText() {
    if (status) return status;
    if (game.isCheckmate()) return isUserTurn ? "Matt! Vesztettél." : "Matt! Nyertél!";
    if (game.isDraw()) return "Döntetlen.";
    if (game.isCheck()) return isUserTurn ? "Sakkban vagy!" : "Sakkot adtál!";
    return isUserTurn ? "Te jössz (fehér)" : "Gép gondolkodik...";
  }

  return (
    <div style={{ width: "400px", margin: "auto" }}>
      <button onClick={handleRestart} style={{ marginBottom: "10px" }}>
        Új játék
      </button>
      <div style={{ marginBottom: "10px" }}>{getStatusText()}</div>
      <Chessboard
        position={game.fen()}
        onPieceDrop={onDrop}
        arePiecesDraggable={isUserTurn && !game.isGameOver()}
        boardOrientation="white"
      />
    </div>
  );
}
