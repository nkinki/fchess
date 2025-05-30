// src/app/ChessGame.tsx
"use client";
import { useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

function getRandomMove(game: Chess) {
  const moves = game.moves();
  if (moves.length === 0) return null;
  const randomIdx = Math.floor(Math.random() * moves.length);
  return moves[randomIdx];
}

// A page.tsx-ből kivettem a canStartNewGame propot, mert itt nem volt használva.
// Ha mégis kell, vissza lehet tenni, és a page.tsx-ben is kezelni.
export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [isUserTurn, setIsUserTurn] = useState(true);
  const [status, setStatus] = useState("");

  function makeAIMove(currentGame: Chess) {
    const move = getRandomMove(currentGame);
    if (move) {
      currentGame.move(move);
      setGame(new Chess(currentGame.fen()));
      setIsUserTurn(true);
      // Itt frissíthetnénk a státuszt a gép lépése után, ha a játék véget ér vagy sakk van
      if (currentGame.isGameOver()) {
        // Kezelhetnénk a játék végét itt is, vagy a getStatusText-ben
      } else if (currentGame.isCheck()) {
        // status frissítése
      }
    }
  }

  function onDrop(sourceSquare: string, targetSquare: string) {
    if (!isUserTurn || game.isGameOver()) return false; // Hozzáadtam game.isGameOver() ellenőrzést
    
    // Készítsünk egy másolatot a lépéshez, hogy az eredeti 'game' objektum ne módosuljon közvetlenül itt
    const gameCopy = new Chess(game.fen());
    const move = gameCopy.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });

    if (move === null) return false;

    setGame(gameCopy); // Frissítjük az állapotot a másolattal
    setIsUserTurn(false);
    setStatus(""); // Töröljük az előző státuszt

    if (gameCopy.isGameOver()) {
      // A getStatusText majd kezeli a játék vége üzenetet
      return true;
    }

    setTimeout(() => {
      // Itt is egy friss másolatot használjunk, ha a gameCopy állapota esetleg máshol is változhatna
      const gameAfterUserMove = new Chess(gameCopy.fen()); 
      if (!gameAfterUserMove.isGameOver()) {
        makeAIMove(gameAfterUserMove);
        // A makeAIMove frissíti a setGame-et, ami újrarenderelést okoz
      }
    }, 400);
    return true;
  }

  function handleRestart() {
    setGame(new Chess());
    setIsUserTurn(true);
    setStatus("");
  }

  function getStatusText() {
    if (game.isCheckmate()) { // Fontos, hogy a 'game' state-et használjuk itt
      return isUserTurn ? "Matt! Vesztettél." : "Matt! Nyertél!";
    }
    if (game.isDraw()) return "Döntetlen.";
    if (game.isStalemate()) return "Patt! Döntetlen.";
    if (game.isThreefoldRepetition()) return "Háromszori lépésismétlés! Döntetlen.";
    if (game.isInsufficientMaterial()) return "Nincs elég anyag a matthoz! Döntetlen.";
    
    if (status) return status; // Ha van manuálisan beállított státusz (pl. "Játék vége!")
    
    if (game.isCheck()) return isUserTurn ? "Sakkban vagy!" : "Sakkot adtál!";
    return isUserTurn ? "Te jössz (fehér)" : "Gép gondolkodik...";
  }

  return (
    <div style={{ width: "400px", margin: "auto", marginTop:"10px" }}>
      <button onClick={handleRestart} style={{ marginBottom: "10px", padding:"8px 15px", fontSize:"1em", cursor:"pointer" }}>
        Új játék
      </button>
      <div style={{ marginBottom: "10px", minHeight:"20px", fontWeight:"bold" }}>{getStatusText()}</div>
      <Chessboard
        position={game.fen()}
        onPieceDrop={onDrop}
        arePiecesDraggable={isUserTurn && !game.isGameOver()}
        boardOrientation="white"
      />
    </div>
  );
}