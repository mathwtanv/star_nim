const pegCount = 9;
const pegSize = 50;
let pegElements = [];
let currentPlayer = 1;

const connections = [
  [0, 5], [0, 4], [1, 6], [1, 5], [2, 7],
  [2, 6], [3, 8], [3, 7], [4, 8]
];

const pegOffsets = [
  { x: -11.8, y: 8 }, { x: -34.5, y: 37 }, { x: -23.5, y: 14.3 },
  { x: -18, y: -7 }, { x: -14, y: 10 }, { x: -14, y: 8.5 },
  { x: 5, y: -13 }, { x: 28, y: 23.5 }, { x: 17, y: 33 }
];

let selectedPegs = [];
let gameMode = null;

document.addEventListener("DOMContentLoaded", () => {
  const game = document.getElementById("game");
  const centerX = game.clientWidth / 2;
  const centerY = game.clientHeight / 2;
  const radius = Math.min(centerX, centerY) - pegSize * 1 / 1.5;

  // Create pegs
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

  initGameUI();
  updateTurnText();

  document.getElementById("resetBtn")?.addEventListener("click", fullReset);
});

// AI move logic
function aiMove() {
  // Get all remaining pegs
  const remaining = pegElements
    .map((el, i) => !el.classList.contains("removed") ? i : null)
    .filter(i => i !== null);

  if (remaining.length === 1) {
    // Only one peg left → remove it
    pegElements[remaining[0]].classList.add("removed");
    checkWin(currentPlayer);
    return;
  }

  // Find valid pairs where both pegs are still available
  const validPairs = connections.filter(([a, b]) =>
    !pegElements[a].classList.contains("removed") &&
    !pegElements[b].classList.contains("removed")
  );

  // Build "heaps": singletons and connected pairs
  let heaps = remaining.map(i => [i]);
  validPairs.forEach(([a, b]) => {
    if (heaps.find(h => h.includes(a) && h.includes(b))) return; // already in heap
    // Combine connected pegs into a heap if both exist
    if (remaining.includes(a) && remaining.includes(b)) {
      heaps = heaps.filter(h => !h.includes(a) && !h.includes(b));
      heaps.push([a, b]);
    }
  });

  // Calculate nim sum (XOR of heap sizes)
  const nimSum = heaps.reduce((acc, h) => acc ^ h.length, 0);

  let moveToPlay;

  if (nimSum === 0) {
    // No winning move → pick random heap
    const randomHeap = heaps[Math.floor(Math.random() * heaps.length)];
    moveToPlay = randomHeap.length > 1 ? [randomHeap[0]] : [randomHeap[0]];
  } else {
    // Try to make nim sum 0 by removing from a heap
    for (const heap of heaps) {
      const targetSize = heap.length ^ nimSum;
      if (targetSize < heap.length) {
        // Remove (heap.length - targetSize) pegs
        moveToPlay = heap.slice(0, heap.length - targetSize);
        break;
      }
    }
  }

  // Fallback: if no heap chosen (should not happen), remove first remaining peg
  if (!moveToPlay || moveToPlay.length === 0) moveToPlay = [remaining[0]];

  // Remove the chosen peg(s)
  moveToPlay.forEach(i => pegElements[i].classList.add("removed"));

  // Check win, then proceed
  if (!checkWin(currentPlayer)) {
    nextTurn();
  }
}


// Initialize UI and event listeners
function initGameUI() {
  const texts = document.getElementById("texts");

  texts.innerHTML = `
    <div id="mode-container">
      <div id="label-stack">
        <span class="line-top">Game</span>
        <span class="line-bottom">Mode<span class="colon">:</span></span>
      </div>
      <select id="game-mode">
        <option value="" selected disabled>Select</option>
        <option value="2p">2 Player</option>
        <option value="ai-first">AI First</option>
        <option value="ai-second">AI Second</option>
      </select>
    </div>
    <div id="turn-indicator" style="display:none">
      <div id="turn-text"></div>
    </div>
  `;

  const gameModeSelect = document.getElementById("game-mode");
  const modeSelectDiv = document.getElementById("mode-container");
  const turnIndicator = document.getElementById("turn-indicator");

  gameModeSelect.addEventListener("change", function () {
    gameMode = this.value;
    modeSelectDiv.style.display = "none";
    turnIndicator.style.display = "block";
    resetGame();
    updateTurnText();

    if (gameMode === "ai-first") {
      setTimeout(() => {
        aiMove();
        updateTurnText();
      }, 600);
    }
  });
}

// Peg selection & removal
function removePegAndPartner(index) {
  if (!gameMode) return;

  const pegEl = pegElements[index];
  if (!pegEl || pegEl.classList.contains("removed")) return;

  const lastPlayer = currentPlayer;

  const partners = connections
    .filter(([a, b]) =>
      (a === index && !pegElements[b].classList.contains("removed")) ||
      (b === index && !pegElements[a].classList.contains("removed"))
    )
    .map(([a, b]) => (a === index ? b : a));

  // --- CASE: nothing selected yet ---
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

  // --- CASE: already two selected → click one of them to remove ---
  if (selectedPegs.length === 2) {
    if (selectedPegs.includes(index)) {
      selectedPegs.forEach(i => pegElements[i].classList.add("removed"));
      selectedPegs = [];
      clearHighlights();

      // ✅ Check win for player who just moved
      if (checkWin(lastPlayer)) return;

      nextTurnIfNeeded();
      return;
    } else {
      selectedPegs = [index];
      clearHighlights();
      pegEl.classList.add("selected");
      return;
    }
  }

  // --- CASE: only one peg selected so far ---
  if (selectedPegs.length === 1) {
    if (index === first) {
      pegElements[first].classList.add("removed");
      selectedPegs = [];
      clearHighlights();

      // ✅ Check win after human removes peg
      if (checkWin(lastPlayer)) return;

    } else if (firstPartners.includes(index)) {
      selectedPegs.push(index);
      pegEl.classList.add("selected");
      return;
    } else {
      selectedPegs = [index];
      clearHighlights();
      pegEl.classList.add("selected");
      return;
    }

    nextTurnIfNeeded();
    return;
  }
}

// --- Helper functions ---
function showWinText(lastPlayer) {
  if (gameMode === "2p") {
    document.getElementById("texts").innerHTML =
      `<span style="color:#585858;">Player</span> <span style="color:#86d4ea;">${lastPlayer}</span> <span style="color:#585858;">wins!</span>`;
  } else {
    // Determine human player
    const humanPlayer = (gameMode === "ai-first") ? 2 : 1;

    if (lastPlayer === humanPlayer) {
      document.getElementById("texts").innerHTML =
        `<span style="color:#86d4ea;">You</span> <span style="color:#585858;">win!</span>`;
    } else {
      document.getElementById("texts").innerHTML =
        `<span style="color:#86d4ea;">AI</span> <span style="color:#585858;">wins!</span>`;
    }
  }
}


function nextTurnIfNeeded() {
  if (gameMode === "2p") {
    switchPlayer();
  } else {
    nextTurn();
  }
}

// Helpers
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
  return connections.some(([a, b]) => (a === i1 && b === i2) || (a === i2 && b === i1));
}

function switchPlayer() {
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  updateTurnText();
}

function nextTurn() {
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  updateTurnText();

  // If it's AI's turn, disable clicks
  if ((gameMode === "ai-first" && currentPlayer === 1) ||
      (gameMode === "ai-second" && currentPlayer === 2)) {
    pegElements.forEach(el => el.style.pointerEvents = "none"); // ❌ block human clicks
    
    setTimeout(() => {
      aiMove();
      pegElements.forEach(el => {
        if (!el.classList.contains("removed")) {
          el.style.pointerEvents = "auto"; // ✅ allow human clicks again
        }
      });
    }, 600);
  }
}


function resetGame() {
  pegElements.forEach(el => {
    el.classList.remove("removed", "selected", "highlighted");
    el.style.pointerEvents = "auto";
  });
  currentPlayer = 1;
  selectedPegs = [];
}

function checkWin(lastPlayer = currentPlayer) {
  if (pegElements.every(el => el.classList.contains("removed"))) {
    showWinText(lastPlayer);
    disableBoard();
    return true;
  }
  return false;
}

function disableBoard() {
  pegElements.forEach(el => el.style.pointerEvents = "none");
}

function updateTurnText() {
  const turnText = document.getElementById("turn-text");
  if (!turnText) return;

  if (gameMode === "2p") {
    turnText.innerHTML =
      `<span style="color: #585858;">Player</span> 
       <span style="color: #86d4ea;">${currentPlayer}</span><span style="color: #585858;">'s Turn</span>`;
  } else {
    const aiTurn = `<span style="color: #86d4ea;">AI</span><span style="color: #585858;">'s Turn</span>`;
    const humanTurn = `<span style="color: #86d4ea;">Your</span> <span style="color: #585858;">Turn</span>`;
    if (gameMode === "ai-first") {
      turnText.innerHTML = currentPlayer === 1 ? aiTurn : humanTurn;
    } else if (gameMode === "ai-second") {
      turnText.innerHTML = currentPlayer === 1 ? humanTurn : aiTurn;
    }
  }
}

// Full reset
function fullReset() {
  pegElements.forEach(el => {
    el.classList.remove("removed", "selected", "highlighted");
    el.style.pointerEvents = "none";
  });
  selectedPegs = [];
  currentPlayer = 1;
  gameMode = null;

  const texts = document.getElementById("texts");
  texts.innerHTML = `
    <div id="mode-container">
      <div id="label-stack">
        <span class="line-top">Game</span>
        <span class="line-bottom">Mode<span class="colon">:</span></span>
      </div>
      <select id="game-mode">
        <option value="" selected disabled>Select</option>
        <option value="2p">2 Player</option>
        <option value="ai-first">AI First</option>
        <option value="ai-second">AI Second</option>
      </select>
    </div>
    <div id="turn-indicator" style="display:none">
      <div id="turn-text"></div>
    </div>
  `;

  const gameModeSelect = document.getElementById("game-mode");
  const modeSelectDiv = document.getElementById("mode-container");
  const turnIndicator = document.getElementById("turn-indicator");

  gameModeSelect.addEventListener("change", function () {
    gameMode = this.value;
    modeSelectDiv.style.display = "none";
    turnIndicator.style.display = "block";

    pegElements.forEach(el => el.style.pointerEvents = "auto");

    resetGame();
    updateTurnText();

    if (gameMode === "ai-first") {
      setTimeout(() => {
        aiMove();
        updateTurnText();
      }, 600);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const infoBtn = document.getElementById("info-btn");
  const infoOverlay = document.getElementById("info-overlay");

  if (infoBtn && infoOverlay) {
    infoBtn.addEventListener("click", () => {
      infoOverlay.style.display = "flex"; // show overlay
    });

    // Close overlay if clicking outside content
    infoOverlay.addEventListener("click", (e) => {
      if (e.target === infoOverlay) {
        infoOverlay.style.display = "none";
      }
    });
  }
});
