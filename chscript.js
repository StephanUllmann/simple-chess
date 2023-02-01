"use strict";

////////////////////////
// Selectors
const boardContainerEl = document.querySelector(".game__board--container");
const boardEl = document.querySelector(".game__board");
const gameFieldEl = document.getElementsByClassName("game__field");
const root = document.documentElement;
const beatenBoardWhiteEl = document.getElementById("beaten--0");
const beatenBoardBlackEl = document.getElementById("beaten--1");
const beatenFieldsEl = document.getElementsByClassName("beaten-pieces");

////////////////////////

const boardCoords = [];
const allPiecesCoords = [new Map(), new Map()];
const beatenFields = [[], []];
const piecesOnBeaten = [new Map(), new Map()];

const players = [0, 1];
let activePlayer = players[0];
let rivalPlayer = activePlayer === 0 ? 1 : 0;
let selectedPiece;

////////////////////////
// Classes Chess Pieces
const chessPiecesArr = [];

class ChessPiece {
  hasBeenMoved = false;

  constructor(namestring) {
    this.namestring = namestring;
    this.curCoords = this.namestring.split("-").slice(-2).join("-"); // CR: code smell , besser direkt initialisierren im konstruktor
    this.imgName = this.namestring.split("-").at(0); // CR: dito
    chessPiecesArr.push(this); // CR: würde ich eventuell in eine klasse Board auslagern
  }

  checkIfInitial() {
    return this.namestring.slice(-3) === this.curCoords;
  }

  getPossibleMovs(playerType = "active") {
    const player = playerType === "active" ? activePlayer : rivalPlayer;
    const coordArr = this.curCoords.split("-").map((num) => Number(num));
    const moveset = this.moveset();
    return (this.possibleMovs = moveset
      .map((arr) => arr.map((val, i) => val + coordArr[i]))
      .map((arr) => arr.join("-"))
      .filter((arr) => boardCoords.includes(arr))
      .filter((arr) => !allPiecesCoords[player].has(arr)));
  }

  // needs to be fully implemented
  // animateMovement(img, coords) {
  //   const curCoordsArr = this.curCoords.split("-").map((num) => Number(num));
  //   const destCoordsArr = coords.split("-").map((num) => Number(num));
  //   const xy = curCoordsArr.map((num, i) => (num + destCoordsArr[i]) * 11);
  //   root.style.setProperty("--move-toX", `${xy[0]}vh`);
  //   root.style.setProperty("--move-toY", `${xy[1]}vh`);

  //   img.classList.add("game__piece--moving");
  //   console.log(img);
  // }

  updateAllPiecesCoords(coords) {
    allPiecesCoords[activePlayer].delete(this.curCoords);
    this.curCoords = coords;
    allPiecesCoords[activePlayer].set(this.curCoords, this.namestring);
  }

  movePiece(coords) {
    // if (!this.possibleMovs.includes(coords)) return;
    const currentImg = document.getElementById(`img-${this.curCoords}`);

    // this.animateMovement(currentImg, coords);

    currentImg.remove();
    if (allPiecesCoords[rivalPlayer].has(coords))
      ChessPiece.removeBeatenPiece(coords);

    placeImg(coords, this);
    this.updateAllPiecesCoords(coords);
    if (this instanceof King && !this.hasBeenMoved) this.determineCastling();
    if (!this.hasBeenMoved) this.hasBeenMoved = true;

    if (this instanceof Pawn) {
      this.changePieceIfLastRow();
    } else {
      endMove();
    }
  }

  static removeBeatenPiece(coords) {
    const rivalPiece = getPlayersPiece(coords, "rival");
    const currentImg = document.getElementById(`img-${rivalPiece.curCoords}`);
    currentImg.remove();
    allPiecesCoords[rivalPlayer].delete(coords);
    const beatenCoords = beatenFields[activePlayer].pop();
    rivalPiece.curCoords = beatenCoords;
    piecesOnBeaten[rivalPlayer].set(beatenCoords, rivalPiece.namestring);
    placeImg(beatenCoords, rivalPiece);
    if (rivalPiece instanceof King) winGame(activePlayer);
  }

  getDiagonal(player, direction) {
    return this.curCoords
      .split("-")
      .map((num) => Number(num))
      .map((num, i) => {
        if (i === 0) return direction === "left" ? num - 1 : num + 1;
        else return player === 0 ? num - 1 : num + 1;
      })
      .join("-");
  }

  getFront(player) {
    return this.curCoords
      .split("-")
      .map((num) => Number(num))
      .map((num, i) => {
        if (i === 0) return num;
        else return player === 0 ? num - 1 : num + 1;
      })
      .join("-");
  }
}

class King extends ChessPiece {
  moveArr = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ];

  getKingsColor() {
    return activePlayer === 0 ? "w" : "b";
  }
  getKingsRow() {
    return activePlayer === 0 ? "7" : "0";
  }

  determineCastling() {
    const isKingSide = this.curCoords.at(0) === "6";
    if (!isKingSide && !this.curCoords.at(0) === "2") endMove();
    const castlingRook = isKingSide
      ? chessPiecesArr.find((obj) =>
          obj.namestring.startsWith(
            `rook_${this.getKingsColor()}-7-${this.getKingsRow()}`
          )
        )
      : chessPiecesArr.find((obj) =>
          obj.namestring.startsWith(
            `rook_${this.getKingsColor()}-0-${this.getKingsRow()}`
          )
        );
    const moveCoordsRook = isKingSide
      ? `5-${this.getKingsRow()}`
      : `3-${this.getKingsRow()}`;
    castlingRook.movePiece(moveCoordsRook);
    endMove();
  }

  checkSideforCastling(rook) {
    if (rook.hasBeenMoved) return [];
    const isKingSide = rook.namestring.at(7) === "7" ? true : false;
    const coordsToCheck = isKingSide
      ? [`5-${rook.namestring.at(-1)}`, `6-${rook.namestring.at(-1)}`]
      : [
          `1-${rook.namestring.at(-1)}`,
          `2-${rook.namestring.at(-1)}`,
          `3-${rook.namestring.at(-1)}`,
        ];
    const pieceInTheWay = coordsToCheck.some(
      (coords) =>
        allPiecesCoords[activePlayer].has(coords) ||
        allPiecesCoords[rivalPlayer].has(coords)
    );
    if (pieceInTheWay) return [];
    return isKingSide ? [2, 0] : [-2, 0];
  }

  checkForCastling() {
    if (this.hasBeenMoved) return [...this.moveArr];
    const rookKingSide = chessPiecesArr.find((obj) =>
      obj.namestring.startsWith(
        `rook_${this.getKingsColor()}-7-${this.getKingsRow()}`
      )
    );
    const rookQueenSide = chessPiecesArr.find((obj) =>
      obj.namestring.startsWith(
        `rook_${this.getKingsColor()}-0-${this.getKingsRow()}`
      )
    );
    return [
      ...this.moveArr,
      this.checkSideforCastling(rookKingSide),
      this.checkSideforCastling(rookQueenSide),
    ];
  }

  checkIfPermitted(moveArr) {
    const moveCopy = [...moveArr];
    const coordArr = this.curCoords.split("-").map((num) => Number(num));
    const curCoordKingTempCopy = this.curCoords;
    const rivalArr = Array.from(allPiecesCoords[rivalPlayer].keys());

    const allRivalPieces = rivalArr
      .map((coords) => getPlayersPiece(coords, "rival"))
      .filter((piece) => !piece.imgName.startsWith("king"));
    const rivalKing = chessPiecesArr.find((obj) =>
      obj.namestring.startsWith(`king_${rivalPlayer === 0 ? "w" : "b"}`)
    );
    const rivalKingCurCoords = rivalKing.curCoords
      .split("-")
      .map((num) => Number(num));
    const rivalKingMoves = rivalKing.moveArr
      .map((arr) => arr.map((val, i) => val + rivalKingCurCoords[i]))
      .map((arr) => arr.join("-"))
      .filter((arr) => boardCoords.includes(arr))
      .filter((arr) => !allPiecesCoords[rivalPlayer].has(arr));

    const kingMoveMap = new Map();

    for (const move of moveCopy) {
      const curKingMoves = move.map((val, i) => val + coordArr[i]).join("-");
      kingMoveMap.set(curKingMoves, move);
    }
    this.updateAllPiecesCoords("none");

    for (const [cur, mov] of kingMoveMap.entries()) {
      if (allPiecesCoords[activePlayer].has(cur)) {
        kingMoveMap.delete(cur);
        continue;
      }
      let curCoordsRivalTempCopy;
      if (allPiecesCoords[rivalPlayer].has(cur)) {
        curCoordsRivalTempCopy = [cur, allPiecesCoords[rivalPlayer].get(cur)];
        allPiecesCoords[rivalPlayer].delete(cur);
      }
      let allRivalMoves = allRivalPieces.map((piece) =>
        piece instanceof Pawn
          ? [
              piece.getDiagonal(rivalPlayer, "left"),
              piece.getDiagonal(rivalPlayer, "right"),
            ]
          : piece.getPossibleMovs("rival")
      );
      allRivalMoves = allRivalMoves.concat(rivalKingMoves);
      allRivalMoves = allRivalMoves.flat();
      if (allRivalMoves.includes(cur)) kingMoveMap.delete(cur);
      if (curCoordsRivalTempCopy)
        allPiecesCoords[rivalPlayer].set(
          curCoordsRivalTempCopy[0],
          curCoordsRivalTempCopy[1]
        );
    }
    this.updateAllPiecesCoords(curCoordKingTempCopy);
    const checkedMoveArr = Array.from(kingMoveMap.values());
    if (!checkedMoveArr.includes([1, 0] && checkedMoveArr.includes[(2, 0)]))
      delete checkedMoveArr.indexOf([2, 0]);
    if (!checkedMoveArr.includes([-1, 0] && checkedMoveArr.includes[(-2, 0)]))
      delete checkedMoveArr.indexOf([-2, 0]);

    return Array.from(kingMoveMap.values());
  }

  moveset = function () {
    const castling = this.checkForCastling();
    const checkedMoves = this.checkIfPermitted([...this.moveArr, ...castling]);

    return checkedMoves;
  };
}

class Queen extends ChessPiece {
  adjustMoves(moveArr) {
    const moveCopy = [...moveArr];
    const coordArr = this.curCoords.split("-").map((num) => Number(num));
    let previousMovCoords = this.curCoords;

    for (let i = 0; i < moveCopy.length; i++) {
      const movCoords = moveCopy[i]
        .map((val, i) => val + coordArr[i])
        .join("-");
      if (
        boardCoords.includes(movCoords) &&
        !allPiecesCoords[activePlayer].has(movCoords)
      ) {
        previousMovCoords = movCoords;
        if (allPiecesCoords[rivalPlayer].has(previousMovCoords)) continue;
        moveCopy.push(
          moveCopy[i].map((val) => {
            if (val > 0) return val + 1;
            else if (val < 0) return val - 1;
            else return 0;
          })
        );
      }
    }
    return moveCopy;
  }

  moveset = function () {
    const moveArr = [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ];

    const adjustedMoves = this.adjustMoves(moveArr);

    return adjustedMoves;
  };
}

class Rook extends Queen {
  moveset = function () {
    const moveArr = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ];
    const adjustedMoves = this.adjustMoves(moveArr);

    return adjustedMoves;
  };
}

class Bishop extends Queen {
  moveset = function () {
    // CR: hier passiert shadowing der base class member variable, das ist etwas unschön
    const moveArr = [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];

    const adjustedMoves = this.adjustMoves(moveArr);

    return adjustedMoves;
  };
}

class Knight extends ChessPiece {
  moveset = function () {
    return [
      [-1, -2],
      [1, -2],
      [-1, 2],
      [1, 2],
      [-2, -1],
      [-2, 1],
      [2, -1],
      [2, 1],
    ];
  };
}

class Pawn extends ChessPiece {
  buildPawnMovements(player) {
    const moveArr = [player === 0 ? [0, -1] : [0, 1]];
    if (
      this.checkIfInitial() &&
      !allPiecesCoords[rivalPlayer].has(this.getFront(player))
    ) {
      moveArr.push(player === 0 ? [0, -2] : [0, 2]);
    }

    if (allPiecesCoords[rivalPlayer].has(this.getDiagonal(player, "left"))) {
      moveArr.push(player === 0 ? [-1, -1] : [-1, 1]);
    }
    if (allPiecesCoords[rivalPlayer].has(this.getDiagonal(player, "right"))) {
      moveArr.push(player === 0 ? [1, -1] : [1, 1]);
    }
    if (allPiecesCoords[rivalPlayer].has(this.getFront(player))) {
      moveArr.shift();
    }
    return moveArr;
  }

  moveset() {
    const moveArr = this.buildPawnMovements(activePlayer);
    return moveArr;
  }

  changePieceIfLastRow() {
    const thisPawn = this;

    const replacePawn = function (e, thisPawn) {
      const clickedPiece = chessPiecesArr.find(
        (obj) =>
          obj.namestring ===
          piecesOnBeaten[activePlayer].get(e.target.dataset["coords"])
      );
      const thisPawnImg = document.getElementById(`img-${thisPawn.curCoords}`);
      const clickedPieceImg = document.getElementById(
        `img-${clickedPiece.curCoords}`
      );
      thisPawnImg.remove();
      clickedPieceImg.remove();
      allPiecesCoords[activePlayer].delete(thisPawn.curCoords);
      [thisPawn.curCoords, clickedPiece.curCoords] = [
        clickedPiece.curCoords,
        thisPawn.curCoords,
      ];
      allPiecesCoords[activePlayer].set(
        clickedPiece.curCoords,
        clickedPiece.namestring
      );
      piecesOnBeaten[rivalPlayer].set(thisPawn.curCoords, thisPawn.namestring);

      placeImg(thisPawn.curCoords, thisPawn);
      placeImg(clickedPiece.curCoords, clickedPiece);
      document
        .getElementById(`beaten--${rivalPlayer}`)
        .removeEventListener("click", function (e) {
          replacePawn(e, thisPawn);
        });
      endMove();
    };

    const condition = activePlayer === 0 ? "0" : "7";
    if (this.curCoords.at(-1) === condition) {
      document
        .getElementById(`beaten--${rivalPlayer}`)
        .addEventListener("click", function (e) {
          replacePawn(e, thisPawn);
        });
    } else {
      endMove();
    }
  }
}

const kingW = new King("king_w-4-7");
const kingB = new King("king_b-4-0");

const queenW = new Queen("queen_w-3-7");
const queenB = new Queen("queen_b-3-0");

const rookW07 = new Rook("rook_w-0-7");
const rookW77 = new Rook("rook_w-7-7");
const rookB00 = new Rook("rook_b-0-0");
const rookB70 = new Rook("rook_b-7-0");

const bishopW27 = new Bishop("bishop_w-2-7");
const bishopW57 = new Bishop("bishop_w-5-7");
const bishopB20 = new Bishop("bishop_b-2-0");
const bishopB50 = new Bishop("bishop_b-5-0");

const knightW17 = new Knight("knight_w-1-7");
const knightW67 = new Knight("knight_w-6-7");
const knightB10 = new Knight("knight_b-1-0");
const knightB60 = new Knight("knight_b-6-0");

const pawnW06 = new Pawn("pawn_w-0-6");
const pawnW16 = new Pawn("pawn_w-1-6");
const pawnW26 = new Pawn("pawn_w-2-6");
const pawnW36 = new Pawn("pawn_w-3-6");
const pawnW46 = new Pawn("pawn_w-4-6");
const pawnW56 = new Pawn("pawn_w-5-6");
const pawnW66 = new Pawn("pawn_w-6-6");
const pawnW76 = new Pawn("pawn_w-7-6");

const pawnB01 = new Pawn("pawn_b-0-1");
const pawnB11 = new Pawn("pawn_b-1-1");
const pawnB21 = new Pawn("pawn_b-2-1");
const pawnB31 = new Pawn("pawn_b-3-1");
const pawnB41 = new Pawn("pawn_b-4-1");
const pawnB51 = new Pawn("pawn_b-5-1");
const pawnB61 = new Pawn("pawn_b-6-1");
const pawnB71 = new Pawn("pawn_b-7-1");

const initialCoords = new Map();

const setStandardInitialCoords = function () {
  chessPiecesArr.forEach((piece) =>
    initialCoords.set(piece.curCoords, piece.imgName)
  );
};

const setLoadedInitialCoords = function () {};

// Build board

let loaded = false;

const buildBoard = function () {
  if (loaded) setLoadedInitialCoords();
  else setStandardInitialCoords();
  boardEl.innerHTML = "";
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const coord = `${i}-${j}`;
      let piece = initialCoords.get(coord);
      const html = `<div class="field game__field ${
        i % 2 === 0 ? "even" : "odd"
      }" data-coords="${coord}" ${
        piece
          ? `data-piece="${piece}-${coord}"><img class="game__piece"
      src="./lib/pieces/${piece}.webp"
      alt="${piece}" data-coords="${coord}" id="img-${coord}"
    />`
          : ""
      }</div>`;
      boardEl.insertAdjacentHTML("beforeend", html);
      if (piece && piece.slice(-1) === "w") {
        allPiecesCoords[0].set(coord, `${piece}-${coord}`);
      } else if (piece && piece.slice(-1) === "b") {
        allPiecesCoords[1].set(coord, `${piece}-${coord}`);
      }

      boardCoords.push(coord);
    }
  }
  document
    .getElementById(`player__label--${activePlayer}`)
    .classList.toggle("player__label--active");
};

const buildBeatenBoards = function () {
  beatenBoardWhiteEl.innerHTML = "";
  beatenBoardBlackEl.innerHTML = "";

  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 8; j++) {
      const coord = `${i}-${j}`;

      const html = function (color) {
        beatenFields[color].unshift(`${color}-${coord}`);

        return `<div class="field beaten-pieces" data-coords="${color}-${coord}"></div>`;
      };
      beatenBoardWhiteEl.insertAdjacentHTML("beforeend", html(0));
      beatenBoardBlackEl.insertAdjacentHTML("beforeend", html(1));
    }
  }
};

const init = function () {
  buildBoard();
  buildBeatenBoards();
};

////////////////////////
// Functions on click

const winGame = function (player) {
  // Needs to be fully implemented
  const playerName = player === 0 ? "White" : "Black";
  alert(`${playerName} wins!`);
};

const changePlayer = function () {
  document
    .getElementById(`player__label--${activePlayer}`)
    .classList.toggle("player__label--active");
  activePlayer = activePlayer === 0 ? 1 : 0;
  rivalPlayer = activePlayer === 0 ? 1 : 0;
  document
    .getElementById(`player__label--${activePlayer}`)
    .classList.toggle("player__label--active");
};

const endMove = function () {
  selectedPiece = "";
  clearFields();
  changePlayer();
};

const placeImg = function (coords, piece) {
  const newField = document.querySelector(`div[data-coords="${coords}"]`);
  const html = `<img class="game__piece"
src="./lib/pieces/${piece.imgName}.webp"
alt="${piece.imgName}" data-coords="${coords}" id="img-${coords}"/>`;
  newField.insertAdjacentHTML("afterbegin", html);
};

const getPlayersPiece = function (coords, playerType) {
  const player = playerType === "active" ? activePlayer : rivalPlayer;
  const clickedPiece = chessPiecesArr.find(
    (obj) => obj.namestring === allPiecesCoords[player].get(coords)
  );
  return clickedPiece;
};

const clearFields = function () {
  const highlightedFields = document.querySelectorAll(".field__highlight");
  highlightedFields.forEach((field) =>
    field.classList.remove("field__highlight")
  );
};

const clearSelectionIfPlayersPiece = function (coords) {
  if (allPiecesCoords[activePlayer].has(coords)) {
    selectedPiece = "";
  }
};

const highlightFields = function (coordsArr) {
  coordsArr.forEach((coord) => {
    if (!boardCoords.includes(coord)) return;
    document
      .querySelector(`div[data-coords="${coord}"]`)
      .classList.add("field__highlight");
  });
};

const activatePiece = function (coords) {
  if (!allPiecesCoords[activePlayer].has(coords)) return;
  const clickedPiece = getPlayersPiece(coords, "active");
  const toHighlight = clickedPiece.getPossibleMovs();
  toHighlight.push(coords);
  highlightFields(toHighlight);
  return clickedPiece;
};

////////////////////////
// Event Listeners

boardEl.addEventListener("click", function (e) {
  clearFields();

  const clickedCoords = e.target.dataset.coords;
  clearSelectionIfPlayersPiece(clickedCoords);
  if (selectedPiece) {
    selectedPiece.movePiece(clickedCoords);
  } else {
    selectedPiece = activatePiece(clickedCoords);
  }
});

//
//
//
init();
