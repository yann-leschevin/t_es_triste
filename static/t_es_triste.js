"use strict";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const PREVIEW_BLOCK = 24;

const COLORS = {
    I: "#22d3ee",
    J: "#3b82f6",
    L: "#fb923c",
    O: "#facc15",
    S: "#4ade80",
    T: "#c084fc",
    Z: "#f87171"
};

const SHAPES = {
    I: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    J: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    L: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ],
    O: [
        [1, 1],
        [1, 1]
    ],
    S: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    T: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    Z: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ]
};

const canvas = document.getElementById("board");
const context = canvas.getContext("2d");

const nextCanvas = document.getElementById("next");
const nextContext = nextCanvas.getContext("2d");

const scoreElement = document.getElementById("score");
const linesElement = document.getElementById("lines");
const levelElement = document.getElementById("level");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const restartButton = document.getElementById("restart");
const scoresList = document.getElementById("scores-list");
const recordForm = document.getElementById("record-form");
const initialesInput = document.getElementById("initiales");
const recordMessage = document.getElementById("record-message");

let board;
let player;
let nextPiece;
let holdPiece;
let canHold;
let bag;
let score;
let lines;
let level;
let paused;
let gameOver;
let dropCounter;
let lastTime;
let animationId;

const QUATRE_LIGNES_POINTS = 800;
const TSPIN_BONUS = QUATRE_LIGNES_POINTS * 2;
let lastWasRotation = false;

const holdCanvas = document.getElementById("hold");
const holdContext = holdCanvas.getContext("2d");

function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function copyShape(shape) {
    return shape.map(row => [...row]);
}

/*
 * Générateur "7-bag" : chaque groupe de sept pièces contient
 * exactement une pièce de chaque type.
 */
function refillBag() {
    bag = Object.keys(SHAPES);

    for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
    }
}

function createPiece() {
    if (bag.length === 0) {
        refillBag();
    }

    const type = bag.pop();

    return {
        type,
        matrix: copyShape(SHAPES[type]),
        x: 0,
        y: 0
    };
}

function positionAtStart(piece) {
    piece.x = Math.floor((COLS - piece.matrix[0].length) / 2);
    piece.y = -firstOccupiedRow(piece.matrix);
}

function firstOccupiedRow(matrix) {
    for (let y = 0; y < matrix.length; y++) {
        if (matrix[y].some(Boolean)) {
            return y;
        }
    }

    return 0;
}

function collision(piece, offsetX = 0, offsetY = 0, matrix = piece.matrix) {
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
            if (!matrix[y][x]) {
                continue;
            }

            const boardX = piece.x + x + offsetX;
            const boardY = piece.y + y + offsetY;

            if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                return true;
            }

            if (boardY >= 0 && board[boardY][boardX] !== null) {
                return true;
            }
        }
    }

    return false;
}

function mergePiece() {
    let aboveBoard = false;

    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (!value) {
                return;
            }

            const boardY = player.y + y;
            const boardX = player.x + x;

            if (boardY < 0) {
                aboveBoard = true;
            } else {
                board[boardY][boardX] = player.type;
            }
        });
    });

    return aboveBoard;
}

function clearLines() {
    let cleared = 0;

    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== null)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(null));
            cleared++;
            y++;
        }
    }

    if (cleared > 0) {
        const points = [0, 100, 300, 500, 800];
        score += points[cleared] * level;
        lines += cleared;
        level = Math.floor(lines / 10) + 1;
        updateStats();
    }

    if (tspin()) {
        score += TSPIN_BONUS * level;
        updateStats();
    }
}

function spawnPiece() {
    player = nextPiece || createPiece();
    nextPiece = createPiece();

    positionAtStart(player);
    drawNext();

    if (collision(player)) {
        finishGame();
    }
}

function lockPiece() {
    const aboveBoard = mergePiece();

    if (aboveBoard) {
        finishGame();
        return;
    }

    clearLines();
    lastWasRotation = false;
    canHold = true;
    spawnPiece();
}

function movePlayer(direction) {
    if (!paused && !gameOver && !collision(player, direction, 0)) {
        player.x += direction;
        lastWasRotation = false;
    }
}

function softDrop() {
    if (paused || gameOver) {
        return;
    }

    if (!collision(player, 0, 1)) {
        player.y++;
        score++;
        lastWasRotation = false;
        updateStats();
    } else {
        lockPiece();
    }

    dropCounter = 0;
}

function automaticDrop() {
    if (!collision(player, 0, 1)) {
        player.y++;
    } else {
        lockPiece();
    }

    dropCounter = 0;
}

function hardDrop() {
    if (paused || gameOver) {
        return;
    }

    let distance = 0;

    while (!collision(player, 0, distance + 1)) {
        distance++;
    }

    player.y += distance;
    score += distance * 2;
    lastWasRotation = false;
    updateStats();
    lockPiece();
    dropCounter = 0;
}

function rotateMatrix(matrix, direction) {
    const rotated = matrix[0].map((_, index) =>
        matrix.map(row => row[index])
    );

    if (direction > 0) {
        rotated.forEach(row => row.reverse());
    } else {
        rotated.reverse();
    }

    return rotated;
}

function rotatePlayer(direction) {
    if (paused || gameOver || player.type === "O") {
        return;
    }

    const rotated = rotateMatrix(player.matrix, direction);

    // Petits décalages latéraux pour permettre les rotations près des murs.
    const kicks = [0, -1, 1, -2, 2];

    for (const kick of kicks) {
        if (!collision(player, kick, 0, rotated)) {
            player.matrix = rotated;
            player.x += kick;
            lastWasRotation = true;
            return;
        }
    }
}

function tspin() {
    if (!player || player.type !== "T" || !lastWasRotation) {
        return false;
    }

    const corners = [
        [player.x - 1, player.y - 1],
        [player.x + 3, player.y - 1],
        [player.x - 1, player.y + 3],
        [player.x + 3, player.y + 3]
    ];

    let occupied = 0;

    for (const [x, y] of corners) {
        if (y < 0) {
            continue;
        }

        if (x < 0 || x >= COLS || y >= ROWS || board[y][x] !== null) {
            occupied++;
        }
    }

    return occupied >= 3;
}

function ghostY() {
    let distance = 0;

    while (!collision(player, 0, distance + 1)) {
        distance++;
    }

    return player.y + distance;
}

function dropInterval() {
    return Math.max(90, 800 * Math.pow(0.85, level - 1));
}

function drawBlock(ctx, x, y, color, size, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x * size, y * size, size, size);

    ctx.fillStyle = "rgba(255, 255, 255, 0.23)";
    ctx.fillRect(x * size + 2, y * size + 2, size - 4, 4);
    ctx.fillRect(x * size + 2, y * size + 2, 4, size - 4);

    ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);
    ctx.globalAlpha = 1;
}

function drawBoardBackground() {
    context.fillStyle = "#080c16";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = "rgba(148, 163, 184, 0.09)";
    context.lineWidth = 1;

    for (let x = 0; x <= COLS; x++) {
        context.beginPath();
        context.moveTo(x * BLOCK, 0);
        context.lineTo(x * BLOCK, canvas.height);
        context.stroke();
    }

    for (let y = 0; y <= ROWS; y++) {
        context.beginPath();
        context.moveTo(0, y * BLOCK);
        context.lineTo(canvas.width, y * BLOCK);
        context.stroke();
    }
}

function drawMatrix(matrix, offsetX, offsetY, type, alpha = 1) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            const drawY = offsetY + y;

            if (value && drawY >= 0) {
                drawBlock(
                    context,
                    offsetX + x,
                    drawY,
                    COLORS[type],
                    BLOCK,
                    alpha
                );
            }
        });
    });
}

function draw() {
    drawBoardBackground();

    board.forEach((row, y) => {
        row.forEach((type, x) => {
            if (type !== null) {
                drawBlock(context, x, y, COLORS[type], BLOCK);
            }
        });
    });

    if (player && !gameOver) {
        const landingY = ghostY();

        if (landingY !== player.y) {
            drawMatrix(
                player.matrix,
                player.x,
                landingY,
                player.type,
                0.22
            );
        }

        drawMatrix(player.matrix, player.x, player.y, player.type);
    }
}

function drawNext() {
    nextContext.fillStyle = "#080c16";
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    const matrix = nextPiece.matrix;
    const width = matrix[0].length * PREVIEW_BLOCK;
    const height = matrix.length * PREVIEW_BLOCK;
    const offsetX = (nextCanvas.width - width) / 2;
    const offsetY = (nextCanvas.height - height) / 2;

    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawPreviewBlock(
                    nextContext,
                    offsetX + x * PREVIEW_BLOCK,
                    offsetY + y * PREVIEW_BLOCK,
                    COLORS[nextPiece.type]
                );
            }
        });
    });
}

function drawHold() {
    holdContext.fillStyle = "#080c16";
    holdContext.fillRect(0, 0, holdCanvas.width, holdCanvas.height);

    if (!holdPiece) {
        return;
    }

    const shape = copyShape(SHAPES[holdPiece]);
    const width = shape[0].length * PREVIEW_BLOCK;
    const height = shape.length * PREVIEW_BLOCK;
    const offsetX = (holdCanvas.width - width) / 2;
    const offsetY = (holdCanvas.height - height) / 2;

    shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawPreviewBlock(
                    holdContext,
                    offsetX + x * PREVIEW_BLOCK,
                    offsetY + y * PREVIEW_BLOCK,
                    COLORS[holdPiece]
                );
            }
        });
    });
}

function holdPieceAction() {
    if (paused || gameOver || !canHold) {
        return;
    }

    const currentType = player.type;

    if (holdPiece) {
        player.type = holdPiece;
        player.matrix = copyShape(SHAPES[holdPiece]);
    } else {
        player = nextPiece;
        nextPiece = createPiece();
        drawNext();
    }

    holdPiece = currentType;
    canHold = false;
    positionAtStart(player);

    drawHold();

    if (collision(player)) {
        finishGame();
    }
}

function drawPreviewBlock(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, PREVIEW_BLOCK, PREVIEW_BLOCK);

    ctx.fillStyle = "rgba(255, 255, 255, 0.23)";
    ctx.fillRect(x + 2, y + 2, PREVIEW_BLOCK - 4, 4);

    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(
        x + 1,
        y + 1,
        PREVIEW_BLOCK - 2,
        PREVIEW_BLOCK - 2
    );
}

function updateStats() {
    scoreElement.textContent = score;
    linesElement.textContent = lines;
    levelElement.textContent = level;
}

function showOverlay(title, text) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlay.classList.remove("hidden");
}

function hideOverlay() {
    overlay.classList.add("hidden");
}

function togglePause() {
    if (gameOver) {
        return;
    }

    paused = !paused;

    if (paused) {
        showOverlay("Pause", isTouch ? "Touchez pour continuer" : "Appuie sur P pour continuer");
    } else {
        hideOverlay();
        lastTime = performance.now();
    }
}

function finishGame() {
    gameOver = true;
    showOverlay("Partie terminée", isTouch ? "Touchez pour recommencer" : "Appuie sur R pour recommencer");
    proposerRecord(score, lines, level);
}

/* ============================================================
 * Meilleurs scores (fichier sur le serveur via scores.php)
 * ============================================================ */

const SCORES_URL = "scores"; // route Flask (app.py)
let meilleursScores = [];
let scoresMax = 10;
let partieEnregistrable = null; // {score, lignes, niveau} en attente d'initiales

function afficherScores(scores, idMoi) {
    scoresList.textContent = "";
    if (!scores.length) {
        const vide = document.createElement("li");
        vide.className = "scores-empty";
        vide.textContent = "Aucun score pour l'instant : à toi de jouer !";
        scoresList.appendChild(vide);
        return;
    }
    scores.forEach(s => {
        const li = document.createElement("li");
        if (idMoi && s.id === idMoi) {
            li.className = "moi";
        }
        li.title = s.lignes + " lignes, niveau " + s.niveau + " — " + s.date;
        const ini = document.createElement("span");
        ini.className = "ini";
        ini.textContent = s.initiales;
        const pts = document.createElement("span");
        pts.className = "pts";
        pts.textContent = s.score.toLocaleString("fr-FR");
        li.append(ini, pts);
        scoresList.appendChild(li);
    });
}

function afficherScoresIndisponibles() {
    scoresList.textContent = "";
    const li = document.createElement("li");
    li.className = "scores-empty";
    li.textContent = "Scores indisponibles pour le moment.";
    scoresList.appendChild(li);
}

function chargerScores() {
    return fetch(SCORES_URL, { cache: "no-store" })
        .then(r => r.json())
        .then(data => {
            if (!data.ok) {
                throw new Error(data.error || "erreur");
            }
            meilleursScores = data.scores;
            scoresMax = data.max || scoresMax;
            afficherScores(meilleursScores);
            return true;
        })
        .catch(() => {
            afficherScoresIndisponibles();
            return false;
        });
}

function entreDansLeClassement(points) {
    if (points <= 0) {
        return false;
    }
    if (meilleursScores.length < scoresMax) {
        return true;
    }
    return points > meilleursScores[meilleursScores.length - 1].score;
}

function proposerRecord(points, nbLignes, niveau) {
    chargerScores().then(ok => {
        // La partie a pu être relancée pendant le chargement
        if (!ok || !gameOver || !entreDansLeClassement(points)) {
            return;
        }
        partieEnregistrable = { score: points, lignes: nbLignes, niveau: niveau };
        overlayTitle.textContent = "Partie terminée";
        overlayText.textContent = "Score : " + points.toLocaleString("fr-FR");
        recordMessage.textContent = "";
        try {
            initialesInput.value = localStorage.getItem("t_es_triste_initiales") || "";
        } catch (e) {
            initialesInput.value = "";
        }
        recordForm.classList.remove("hidden");
        initialesInput.focus();
        initialesInput.select();
    });
}

function cacherFormulaireRecord() {
    partieEnregistrable = null;
    recordForm.classList.add("hidden");
    initialesInput.blur();
}

initialesInput.addEventListener("input", () => {
    // Majuscules A-Z uniquement, 3 lettres maximum
    initialesInput.value = initialesInput.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
});

recordForm.addEventListener("submit", event => {
    event.preventDefault();
    const initiales = initialesInput.value;
    if (!/^[A-Z]{3}$/.test(initiales)) {
        recordMessage.textContent = "Il faut 3 lettres (A à Z).";
        initialesInput.focus();
        return;
    }
    if (!partieEnregistrable) {
        return;
    }
    const envoi = Object.assign({ initiales: initiales }, partieEnregistrable);
    const bouton = recordForm.querySelector("button");
    bouton.disabled = true;
    recordMessage.textContent = "";
    fetch(SCORES_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envoi)
    })
        .then(r => r.json())
        .then(data => {
            if (!data.ok) {
                throw new Error(data.error || "Enregistrement impossible.");
            }
            try {
                localStorage.setItem("t_es_triste_initiales", initiales);
            } catch (e) {
                // stockage local indisponible : sans importance
            }
            meilleursScores = data.scores;
            afficherScores(meilleursScores, data.id);
            cacherFormulaireRecord();
            overlayTitle.textContent = data.rang ? "Bravo, n°" + data.rang + " !" : "Score enregistré";
            overlayText.textContent = isTouch ? "Touchez pour recommencer" : "Appuie sur R pour recommencer";
        })
        .catch(err => {
            recordMessage.textContent = err.message || "Enregistrement impossible.";
        })
        .finally(() => {
            bouton.disabled = false;
        });
});

function resetGame() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }

    board = createBoard();
    bag = [];
    score = 0;
    lines = 0;
    level = 1;
    paused = false;
    gameOver = false;
    dropCounter = 0;
    lastWasRotation = false;
    lastTime = performance.now();
    holdPiece = null;
    canHold = true;

    nextPiece = createPiece();
    spawnPiece();

    cacherFormulaireRecord();
    updateStats();
    hideOverlay();
    drawHold();
    draw();

    animationId = requestAnimationFrame(update);
}

function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;

    if (!paused && !gameOver) {
        dropCounter += Math.min(deltaTime, 100);

        if (dropCounter >= dropInterval()) {
            automaticDrop();
        }
    }

    draw();
    animationId = requestAnimationFrame(update);
}

document.addEventListener("keydown", event => {
    // Pendant la saisie des initiales, les touches servent au texte, pas au jeu
    if (event.target === initialesInput) {
        return;
    }

    const controlledKeys = [
        "ArrowLeft",
        "ArrowRight",
        "ArrowDown",
        "ArrowUp",
        "Space"
    ];

    if (controlledKeys.includes(event.code)) {
        event.preventDefault();
    }

    if (event.repeat && ["KeyP", "KeyR", "Space"].includes(event.code)) {
        return;
    }

    switch (event.code) {
        case "ArrowLeft":
            movePlayer(-1);
            break;

        case "ArrowRight":
            movePlayer(1);
            break;

        case "ArrowDown":
            softDrop();
            break;

        case "ArrowUp":
        case "KeyX":
            rotatePlayer(1);
            break;

        case "KeyZ":
            rotatePlayer(-1);
            break;

        case "Space":
            hardDrop();
            break;

        case "KeyC":
            holdPieceAction();
            break;

        case "KeyP":
            togglePause();
            break;

        case "KeyR":
            resetGame();
            break;
    }
});

restartButton.addEventListener("click", () => {
    resetGame();
    restartButton.blur(); // sinon Espace « clique » à nouveau sur le bouton
});

// ---------- Commandes tactiles ----------
const isTouch = window.matchMedia("(pointer: coarse)").matches;

function touchAction(action) {
    if (action === "pause") {
        if (gameOver) {
            resetGame();
        } else {
            togglePause();
        }
        return;
    }

    if (paused || gameOver) {
        return;
    }

    switch (action) {
        case "left": movePlayer(-1); break;
        case "right": movePlayer(1); break;
        case "down": softDrop(); break;
        case "rotate": rotatePlayer(1); break;
        case "rotate-ccw": rotatePlayer(-1); break;
        case "drop": hardDrop(); break;
        case "hold": holdPieceAction(); break;
    }
}

// Boutons : ◀ ▶ ▼ se répètent tant que le doigt reste appuyé
const REPEATABLE = ["left", "right", "down"];

document.querySelectorAll("#touchpad .tp").forEach(button => {
    const action = button.dataset.action;
    let delayTimer = null;
    let repeatTimer = null;

    const stop = () => {
        clearTimeout(delayTimer);
        clearInterval(repeatTimer);
        button.classList.remove("active");
    };

    button.addEventListener("pointerdown", event => {
        event.preventDefault();
        button.classList.add("active");
        touchAction(action);

        if (REPEATABLE.includes(action)) {
            delayTimer = setTimeout(() => {
                repeatTimer = setInterval(() => touchAction(action), action === "down" ? 40 : 70);
            }, 180);
        }
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach(type => button.addEventListener(type, stop));
    button.addEventListener("contextmenu", event => event.preventDefault());
});

// Gestes sur la grille : toucher = rotation, glisser = déplacer / accélérer,
// lancer vers le bas = chute directe, lancer vers le haut = réserve
const boardContainer = document.getElementById("board-container");
let gesture = null;

boardContainer.addEventListener("touchstart", event => {
    if (event.target.closest("#overlay")) {
        return;
    }

    event.preventDefault();
    const t = event.changedTouches[0];
    gesture = { x: t.clientX, y: t.clientY, startX: t.clientX, startY: t.clientY, time: performance.now(), moved: false };
}, { passive: false });

boardContainer.addEventListener("touchmove", event => {
    if (!gesture) {
        return;
    }

    event.preventDefault();
    const t = event.changedTouches[0];
    const cell = canvas.getBoundingClientRect().width / COLS;

    while (t.clientX - gesture.x >= cell) {
        touchAction("right");
        gesture.x += cell;
        gesture.moved = true;
    }

    while (gesture.x - t.clientX >= cell) {
        touchAction("left");
        gesture.x -= cell;
        gesture.moved = true;
    }

    while (t.clientY - gesture.y >= cell) {
        touchAction("down");
        gesture.y += cell;
        gesture.moved = true;
    }
}, { passive: false });

boardContainer.addEventListener("touchend", event => {
    if (!gesture) {
        return;
    }

    event.preventDefault();
    const t = event.changedTouches[0];
    const dx = t.clientX - gesture.startX;
    const dy = t.clientY - gesture.startY;
    const duration = performance.now() - gesture.time;
    const speed = Math.abs(dy) / Math.max(duration, 1);   // px / ms

    if (duration < 300 && speed > 0.6 && Math.abs(dy) > 2 * Math.abs(dx)) {
        touchAction(dy > 0 ? "drop" : "hold");
    } else if (!gesture.moved && Math.hypot(dx, dy) < 12) {
        touchAction("rotate");
    }

    gesture = null;
}, { passive: false });

boardContainer.addEventListener("touchcancel", () => {
    gesture = null;
});

// Toucher l'écran de pause / fin de partie
// (sauf dans le formulaire des initiales : le toucher ne doit pas relancer la partie)
overlay.addEventListener("click", event => {
    if (event.target.closest("#record-form")) {
        return;
    }
    touchAction("pause");
});

resetGame();
chargerScores();
