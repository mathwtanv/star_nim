const pegCount = 9;
const pegSize = 50;
let pegElements = [];
let currentPlayer = 1;

const connections = [
  [0, 5], // 1-6
  [0, 4], // 1-5
  [1, 6], // 2-7
  [1, 5], // 2-6
  [2, 7], // 3-8
  [2, 6], // 3-7
  [3, 8], // 4-9
  [3, 7], // 4-8
  [4, 8]  // 5-9
];

const pegOffsets = [
  { x: -11.8, y: 8 },  // peg 1
  { x: -34.5, y: 37 },   // peg 2
  { x: -23.5, y: 14.3 }, // peg 3
  { x: -18, y: -7 },     // peg 4
  { x: -14, y: 10 },     // peg 5
  { x: -14, y: 8.5 },    // peg 6
  { x: 5, y: -13 },      // peg 7
  { x: 28, y: 23.5 },    // peg 8
  { x: 17, y: 33 }       // peg 9
];

let selectedPegs = [];

document.addEventListener("DOMContentLoaded", () => {
  const game = document.getElementById("game");
  const centerX = game.clientWidth / 2;
  const centerY = game.clientHeight / 2;
  const radius = Math.min(centerX, centerY) - pegSize * 1 / 1.5;

  for (let i = 0; i < pegCount; i++) {
    const angle = (i / pegCount) * 2 * Math.PI - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle) - pegSize / 2 + (pegOffsets[i].x || 0);
    const y = centerY + radius * Math.sin(angle) - pegSize / 2 + (pegOffsets[i].y || 0);

    const el = document.createElement("div");
    el.classList.add("peg");
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.dataset.index = i;

    el.addEventListener("click", () => removePegAndPartner(i));

    game.appendChild(el);
    pegElements[i] = el;
  }

  document.getElementById("resetBtn")?.addEventListener("click", resetGame);
  updateTurnIndicator();
});

function selectPeg(index) {
  clearHighlights();           // remove old highlights
  selectedPegs = [index];      // only keep this peg selected
  pegElements[index].classList.add("selected");
}

function removePegAndPartner(index) {
  const pegEl = pegElements[index];
  if (!pegEl || pegEl.classList.contains("removed")) return;

  // Compute live partners (connected & not removed)
  const partners = connections
    .filter(([a, b]) =>
      (a === index && !pegElements[b].classList.contains("removed")) ||
      (b === index && !pegElements[a].classList.contains("removed"))
    )
    .map(([a, b]) => (a === index ? b : a));

  const lastPlayer = currentPlayer; // store player making the move

  // No peg selected yet → select this one
  if (selectedPegs.length === 0) {
    selectedPegs = [index];
    pegEl.classList.add("selected");
    return;
  }

  const first = selectedPegs[0];
  const firstPartners = connections
    .filter(([a, b]) =>
      (a === first && !pegElements[b].classList.contains("removed")) ||
      (b === first && !pegElements[a].classList.contains("removed"))
    )
    .map(([a, b]) => (a === first ? b : a));

  // ----- CASE 0 or 1 partner -----
  if (firstPartners.length <= 1) {
    if (index === first) {
      // Remove self or self+partner
      pegElements[first].classList.add("removed");
      if (firstPartners.length === 1) pegElements[firstPartners[0]].classList.add("removed");
      selectedPegs = [];
      clearHighlights();

      if (checkWin()) {
        document.getElementById("texts").innerHTML =
          `<span id="player-label" style="color: #585858;">Player</span> <span id="playerNumber" style="color: #86d4ea;">${lastPlayer}</span> <span id="win-label" style="color: #585858;">wins!</span>`;
        disableBoard();
        return; // do NOT switch player
      }

      // Normal move → switch player
      switchPlayer();
      updateTurnIndicator();
      return;
    } else {
      // Clicking other → select independently
      selectedPegs = [index];
      clearHighlights();
      pegEl.classList.add("selected");
      return;
    }
  }

  // ----- CASE 2 partners -----
  if (firstPartners.length === 2) {
    // If already 2 selected, only clicks on one of these two are valid to remove
    if (selectedPegs.length === 2) {
      if (selectedPegs.includes(index)) {
        // Remove both
        selectedPegs.forEach(i => pegElements[i].classList.add("removed"));
        selectedPegs = [];
        clearHighlights();

        if (checkWin()) {
          document.getElementById("texts").innerHTML =
            `<span id="player-label" style="color: #585858;">Player</span> <span id="playerNumber" style="color: #86d4ea;">${lastPlayer}</span> <span id="win-label" style="color: #585858;">wins!</span>`;
          disableBoard();
          return; // do NOT switch player
        }

        // Normal move → switch player
        switchPlayer();
        updateTurnIndicator();
        return;
      } else {
        // Click outside → unhighlight both, select new peg
        selectedPegs = [index];
        clearHighlights();
        pegEl.classList.add("selected");
        return;
      }
    }

    // Only 1 selected so far → clicking same peg does nothing
    if (index === first) return;

    // Clicking connected partner → highlight it
    if (firstPartners.includes(index)) {
      selectedPegs.push(index);
      pegEl.classList.add("selected");
      return;
    }

    // Clicking anything else → unhighlight first, select new peg
    selectedPegs = [index];
    clearHighlights();
    pegEl.classList.add("selected");
    return;
  }
}


function highlightConnected(index) {
  pegElements.forEach((el, i) => {
    if (isConnected(index, i) && !el.classList.contains("removed")) {
      el.classList.add("highlighted");
    }
  });
}

function clearHighlights() {
  pegElements.forEach(el => el.classList.remove("highlighted", "selected"));
}

function isConnected(i1, i2) {
  return connections.some(([a, b]) =>
    (a === i1 && b === i2) || (a === i2 && b === i1)
  );
}

function switchPlayer() {
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  updateTurnIndicator();
}

function updateTurnIndicator() {
  if (checkWin()) return;

  document.getElementById("texts").innerHTML =
    `<span id="player-label" style="color: #585858;">Player</span> <span id="playerNumber" style="color: #86d4ea;">${currentPlayer}</span>`;
}


function resetGame() {
  pegElements.forEach(el => {
    el.classList.remove("removed", "selected", "highlighted");
    el.style.pointerEvents = "auto";
  });
  currentPlayer = 1;
  selectedPegs = [];
  updateTurnIndicator();
}

function checkWin() {
  return pegElements.every(el => el.classList.contains("removed"));
}

function disableBoard() {
  pegElements.forEach(el => el.style.pointerEvents = "none");
}

const infoBtn = document.getElementById("info-btn");
const infoOverlay = document.getElementById("info-overlay");

infoBtn.addEventListener("click", () => {
  infoOverlay.style.display = "flex"; // show overlay
});

infoOverlay.addEventListener("click", (e) => {
  if (e.target === infoOverlay) { // click outside the content closes
    infoOverlay.style.display = "none";
  }
})