// ==========================================
// Christmas Fest Online Game - Main Application
// ==========================================

import { firestore } from './firebase.js';
import { doc, setDoc, onSnapshot, runTransaction, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Game Configuration
const CONFIG = {
    LEVEL1_ROUNDS: 12,
    LEVEL1_ROUND_TIME: 15,
    LEVEL1_RESULTS_TIME: 5,

    LEVEL2_ROUNDS: 6, // 6 rounds for memory game
    // Round configurations: cards, cols, time limit, max flips
    LEVEL2_ROUND_CONFIG: {
        1: { cards: 8, cols: 4, rows: 2, timeLimit: 45, maxFlips: 10, emojis: 4 },
        2: { cards: 8, cols: 4, rows: 2, timeLimit: 40, maxFlips: 8, emojis: 4 },
        3: { cards: 16, cols: 4, rows: 4, timeLimit: 60, maxFlips: 18, emojis: 8 },
        4: { cards: 16, cols: 4, rows: 4, timeLimit: 50, maxFlips: 16, emojis: 8 },
        5: { cards: 30, cols: 6, rows: 5, timeLimit: 90, maxFlips: 31, emojis: 15 },
        6: { cards: 30, cols: 6, rows: 5, timeLimit: 75, maxFlips: 27, emojis: 15 }
    },
    // All Christmas emojis for memory game
    MEMORY_EMOJIS: ['🎄', '🎅', '⭐', '🎁', '❄️', '⛄', '🦌', '🔔', '🌟', '🕯️', '🍬', '🍪', '🧣', '☃️', '🎀'],

    QUALIFICATION_PERCENT: 50,

    BOX_COLORS: ['red', 'green', 'blue', 'purple', 'gold'],

    OUTCOMES: {
        SMALL_GIFT: { points: 10, probability: 0.30, emoji: '🎁', name: 'Small Gift' },
        MEDIUM_GIFT: { points: 25, probability: 0.25, emoji: '🎄', name: 'Medium Gift' },
        BIG_GIFT: { points: 50, probability: 0.15, emoji: '⭐', name: 'Big Gift' },
        JACKPOT: { points: 100, probability: 0.05, emoji: '🌟', name: 'Jackpot!' },
        MULTIPLIER: { points: 0, multiplier: 2, probability: 0.10, emoji: '💎', name: '2x Multiplier!' },
        FREEZE: { points: 0, skipNext: true, probability: 0.05, emoji: '🧊', name: 'Frozen!' },
        COAL: { points: -30, probability: 0.10, emoji: '💀', name: 'Coal!' }
    },

    TWELVE_DAYS: [
        { emoji: '🎄', name: 'Tree' },
        { emoji: '🎅', name: 'Santa' },
        { emoji: '❄️', name: 'Snowflake' },
        { emoji: '⛄', name: 'Snowman' },
        { emoji: '🦌', name: 'Reindeer' },
        { emoji: '🔔', name: 'Jingle Bell' },
        { emoji: '🌟', name: 'Star' },
        { emoji: '🕯️', name: 'Candle' },
        { emoji: '🍬', name: 'Candy Cane' },
        { emoji: '🍪', name: 'Cookie' },
        { emoji: '🧣', name: 'Scarf' },
        { emoji: '🎁', name: 'Gift' }
    ],

    SLOT_SCORING: {
        DOUBLE_MATCH: 15,
        TRIPLE_MATCH: 40,
        COMPLETE_SET: 150,
        GOLDEN_RINGS_BONUS: 100
    },

    // Animation timings (in milliseconds)
    BOX_OPEN_ANIMATION: 1500,      // Time for box lid to open
    BOX_REVEAL_DELAY: 800,         // Delay before showing outcome
    BOX_RESULT_DISPLAY: 2500,      // Time to display result before transition

    SLOT_MIN_SPIN_TIME: 2500,      // Minimum slot spin duration
    SLOT_MAX_SPIN_TIME: 4000,      // Maximum slot spin duration
    SLOT_REEL_STAGGER: 400,        // Time between each reel stopping
    SLOT_RESULT_PAUSE: 1500,       // Pause after spin before showing results

    ROUND_END_BUFFER: 3000,        // Buffer time after round timer expires before auto-ending

    SYNC_INTERVAL: 1000
};

// Shared Game State (synced via localStorage)
let sharedState = {
    gamePhase: 'lobby',
    playerPasscode: '',
    currentRound: 1,
    roundActive: false,
    roundStartTime: null,
    isPaused: false,
    roundPauseTime: null,
    players: [],
    roundResults: []
};

// Local Player State
let localState = {
    isAdmin: false,
    playerId: '',
    playerName: '',
    level1Score: 0,
    level2Score: 0,
    currentRoundResult: null,
    isFrozen: false,
    roundHistory: [],
    hasActedThisRound: false,
    roundInitialized: false,
    lastRoundNumber: 0,
    lastBoxColor: null,
    // Level 2 memory game state
    flipsLeft: 10,
    flipsUsed: 0,
    pairsFound: 0,
    boardLocked: true,
    firstCardFlipped: null,
    secondCardFlipped: null,
    level2Completed: false,
    level2TimeRemaining: 60,
    timeBonus: 0
};

// DOM Elements cache
const elements = {};

// Timers
let roundTimer = null;
let minigameTimer = null;
let luckMeterAnimator = null;

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    initializeSnow();
    loadSharedState();
    initializeEventListeners();
});

function cacheElements() {
    elements.screens = {
        login: document.getElementById('loginScreen'),
        lobby: document.getElementById('lobbyScreen'),
        level1: document.getElementById('level1Screen'),
        intermission: document.getElementById('intermissionScreen'),
        level2: document.getElementById('level2Screen'),
        results: document.getElementById('resultsScreen'),
        admin: document.getElementById('adminScreen')
    };

    // Login
    elements.loginForm = document.getElementById('loginForm');
    elements.playerNameInput = document.getElementById('playerName');
    elements.passcodeInput = document.getElementById('passcode');

    // Lobby
    elements.lobbyPlayerName = document.getElementById('lobbyPlayerName');
    elements.playerCount = document.getElementById('playerCount');

    // Level 1
    elements.level1Score = document.getElementById('level1Score');
    elements.currentRound = document.getElementById('currentRound');
    elements.timerBar = document.getElementById('timerBar');
    elements.timerText = document.getElementById('timerText');
    elements.timerDisplay = document.getElementById('timerDisplay');
    elements.level1RoundWaiting = document.getElementById('level1RoundWaiting');
    elements.waitingRoundNum = document.getElementById('waitingRoundNum');
    elements.level1GameArea = document.getElementById('level1GameArea');
    elements.boxesContainer = document.getElementById('boxesContainer');
    elements.passBtn = document.getElementById('passBtn');
    elements.frozenOverlay = document.getElementById('frozenOverlay');
    elements.level1RoundResults = document.getElementById('level1RoundResults');
    elements.resultsRoundNum = document.getElementById('resultsRoundNum');
    elements.yourResultEmoji = document.getElementById('yourResultEmoji');
    elements.yourResultText = document.getElementById('yourResultText');
    elements.yourResultPoints = document.getElementById('yourResultPoints');
    elements.allPlayersResults = document.getElementById('allPlayersResults');
    elements.historyList = document.getElementById('historyList');
    elements.level1Leaderboard = document.getElementById('level1Leaderboard');
    elements.level1InfoContent = document.getElementById('level1InfoContent');

    // Intermission
    elements.qualificationMessage = document.getElementById('qualificationMessage');
    elements.intermissionLeaderboard = document.getElementById('intermissionLeaderboard');
    elements.intermissionWaiting = document.getElementById('intermissionWaiting');

    // Level 2 - Memory Match
    elements.level2Score = document.getElementById('level2Score');
    elements.level2CurrentRound = document.getElementById('level2CurrentRound');
    elements.flipsLeftHeader = document.getElementById('flipsLeftHeader');
    elements.pairsFoundHeader = document.getElementById('pairsFoundHeader');
    elements.level2TimerDisplay = document.getElementById('level2TimerDisplay');
    elements.level2TimerBar = document.getElementById('level2TimerBar');
    elements.level2TimerText = document.getElementById('level2TimerText');
    elements.level2RoundWaiting = document.getElementById('level2RoundWaiting');
    elements.level2WaitingText = document.getElementById('level2WaitingText');
    elements.memoryGameContainer = document.getElementById('memoryGameContainer');
    elements.memoryGameBoard = document.getElementById('memoryGameBoard');
    elements.level2RoundResults = document.getElementById('level2RoundResults');
    elements.level2ResultEmoji = document.getElementById('level2ResultEmoji');
    elements.level2ResultText = document.getElementById('level2ResultText');
    elements.level2ResultPoints = document.getElementById('level2ResultPoints');
    elements.finalPairs = document.getElementById('finalPairs');
    elements.finalFlips = document.getElementById('finalFlips');
    elements.level2Leaderboard = document.getElementById('level2Leaderboard');
    elements.level2InfoContent = document.getElementById('level2InfoContent');

    // Results
    elements.winnerReveal = document.getElementById('winnerReveal');
    elements.finalLeaderboard = document.getElementById('finalLeaderboard');
    elements.playAgainBtn = document.getElementById('playAgainBtn');

    // Admin
    elements.adminPasscodeInput = document.getElementById('adminPasscodeInput');
    elements.setPasscodeBtn = document.getElementById('setPasscodeBtn');
    elements.currentPasscode = document.getElementById('currentPasscode');
    elements.adminPlayerCount = document.getElementById('adminPlayerCount');
    elements.gameStatus = document.getElementById('gameStatus');
    elements.statusDot = document.getElementById('statusDot');
    elements.currentPhase = document.getElementById('currentPhase');
    elements.adminCurrentRound = document.getElementById('adminCurrentRound');
    elements.adminLeaderboard = document.getElementById('adminLeaderboard');
    elements.adminRoundResults = document.getElementById('adminRoundResults');
    elements.adminStartLevel1Btn = document.getElementById('adminStartLevel1Btn');
    elements.adminBeginRoundBtn = document.getElementById('adminBeginRoundBtn');
    elements.adminEndLevel1Btn = document.getElementById('adminEndLevel1Btn');
    elements.adminStartLevel2Btn = document.getElementById('adminStartLevel2Btn');
    elements.adminResultsBtn = document.getElementById('adminResultsBtn');
    elements.adminResetBtn = document.getElementById('adminResetBtn');
    elements.adminPauseGameBtn = document.getElementById('adminPauseGameBtn');
    elements.adminResumeGameBtn = document.getElementById('adminResumeGameBtn');

    // Effects
    elements.scorePopup = document.getElementById('scorePopup');
    elements.confettiContainer = document.getElementById('confettiContainer');
    elements.snowContainer = document.getElementById('snowContainer');
    elements.pauseOverlay = document.getElementById('pauseOverlay');
}

function initializeEventListeners() {
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.passBtn.addEventListener('click', handlePass);
    elements.playAgainBtn.addEventListener('click', resetGame);

    // Admin
    elements.setPasscodeBtn.addEventListener('click', setPlayerPasscode);
    elements.adminStartLevel1Btn.addEventListener('click', adminStartLevel1);
    elements.adminBeginRoundBtn.addEventListener('click', adminBeginRound);
    elements.adminPauseGameBtn.addEventListener('click', adminPauseGame);
    elements.adminResumeGameBtn.addEventListener('click', adminResumeGame);
    elements.adminEndLevel1Btn.addEventListener('click', adminEndLevel1);
    elements.adminStartLevel2Btn.addEventListener('click', adminStartLevel2);
    elements.adminResultsBtn.addEventListener('click', adminShowFinalResults);
    elements.adminResetBtn.addEventListener('click', () => {
        if (confirm('Reset the entire game? All progress will be lost.')) {
            resetGame();
        }
    });
}

// ==========================================
// SNOW ANIMATION
// ==========================================

function initializeSnow() {
    const snowflakes = ['❄', '❅', '❆', '✻', '✼', '❉'];
    const container = elements.snowContainer;

    function createSnowflake() {
        const flake = document.createElement('span');
        flake.className = 'snowflake';
        flake.innerHTML = snowflakes[Math.floor(Math.random() * snowflakes.length)];
        flake.style.left = Math.random() * 100 + 'vw';
        flake.style.animationDuration = (Math.random() * 3 + 5) + 's';
        flake.style.opacity = Math.random() * 0.6 + 0.4;
        flake.style.fontSize = (Math.random() * 10 + 10) + 'px';
        container.appendChild(flake);
        setTimeout(() => flake.remove(), 8000);
    }

    for (let i = 0; i < 30; i++) setTimeout(createSnowflake, i * 100);
    setInterval(createSnowflake, 200);
}

// ==========================================
// STATE MANAGEMENT
// ==========================================

function loadSharedState() {
    const gameRef = doc(firestore, "game", "sharedState");
    onSnapshot(gameRef, (docSnap) => {
        if (docSnap.exists()) {
            const remoteState = docSnap.data();
            // Overwrite local state with remote state
            Object.assign(sharedState, remoteState);
        } else {
            // No document yet, save initial state
            saveSharedState();
        }
        syncUI();
    });
}

async function saveSharedState() {
    try {
        const gameRef = doc(firestore, "game", "sharedState");
        // We need to convert the state to a plain object for Firestore
        await setDoc(gameRef, JSON.parse(JSON.stringify(sharedState)));
    } catch (e) {
        console.error("Failed to save shared state:", e);
    }
}



function syncUI() {
    elements.playerCount.textContent = sharedState.players.length;
    elements.adminPlayerCount.textContent = sharedState.players.length;

    if (localState.isAdmin) {
        updateAdminUI();
    } else {
        if (sharedState.isPaused) {
            elements.pauseOverlay.classList.add('active');
        } else {
            elements.pauseOverlay.classList.remove('active');
        }
        handlePhaseChange();
    }

    // Update live leaderboards on player screens
    if (!localState.isAdmin && localState.playerId) {
        updatePlayerLeaderboards();
    }
}

function handlePhaseChange() {
    if (sharedState.isPaused) return; // Don't process phase changes if game is paused

    const phase = sharedState.gamePhase;

    if (phase === 'lobby' && !localState.isAdmin) {
        if (!elements.screens.login.classList.contains('active') &&
            !elements.screens.lobby.classList.contains('active')) {
            showScreen('lobby');
        }
    }

    if (phase === 'level1' && localState.playerId) {
        if (!elements.screens.level1.classList.contains('active')) {
            showScreen('level1');
            initLevel1UI();
        }
        updateLevel1ForRound();
    }

    if (phase === 'intermission' && localState.playerId) {
        if (!elements.screens.intermission.classList.contains('active')) {
            showScreen('intermission');
            showIntermissionLeaderboard();
        }
    }

    if (phase === 'level2' && localState.playerId) {
        if (!elements.screens.level2.classList.contains('active')) {
            showScreen('level2');
            initLevel2UI();
        }
        updateLevel2ForRound();
    }

    if (phase === 'finished' && localState.playerId) {
        if (!elements.screens.results.classList.contains('active')) {
            showScreen('results');
            showFinalResults();
        }
    }
}

// ==========================================
// LOGIN & PLAYER MANAGEMENT
// ==========================================

async function handleLogin(e) {
    e.preventDefault();

    const name = elements.playerNameInput.value.trim();
    const passcode = elements.passcodeInput.value.trim();

    if (!name || !passcode) {
        alert('Please enter your name and passcode');
        return;
    }

    try {
        const adminConfigRef = doc(firestore, "config", "admin");
        const adminConfigSnap = await getDoc(adminConfigRef);

        if (adminConfigSnap.exists() && passcode === adminConfigSnap.data().passcode) {
            localState.isAdmin = true;
            localState.playerName = 'Admin';
            showScreen('admin');
            updateAdminUI();
            return;
        }
    } catch (error) {
        console.error("Error checking admin passcode:", error);
        // Do not block player login if admin check fails, just log it.
    }

    // Explicitly check if passcode has been set by admin
    if (!sharedState.playerPasscode) {
        alert('The game has not been set up by the host yet. Please wait.');
        return;
    }

    if (passcode !== sharedState.playerPasscode) {
        alert('Invalid passcode. Please get the correct code from your host.');
        return;
    }

    localState.playerName = name;
    
    try {
        const gameRef = doc(firestore, "game", "sharedState");
        await runTransaction(firestore, async (transaction) => {
            const gameDoc = await transaction.get(gameRef);
            if (!gameDoc.exists()) {
                throw "Game document does not exist!";
            }

            const data = gameDoc.data();
            const existingPlayer = data.players.find(p => p.name === name);

            if (!existingPlayer) {
                const newPlayerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                localState.playerId = newPlayerId;
                const newPlayer = {
                    id: newPlayerId,
                    name: name,
                    level1Score: 0,
                    level2Score: 0,
                    isQualified: false,
                    status: 'waiting'
                };
                const newPlayers = [...data.players, newPlayer];
                transaction.update(gameRef, { players: newPlayers });
            } else {
                localState.playerId = existingPlayer.id;
                localState.level1Score = existingPlayer.level1Score;
                localState.level2Score = existingPlayer.level2Score;
            }
        });

        elements.lobbyPlayerName.textContent = name;
        showScreen('lobby');
    } catch (error) {
        console.error("Failed to login player:", error);
        alert("Could not join the game. Please try again. " + error);
    }
}

function showScreen(screenName) {
    Object.values(elements.screens).forEach(s => s.classList.remove('active'));
    if (elements.screens[screenName]) {
        elements.screens[screenName].classList.add('active');
    }
}

// ==========================================
// ADMIN FUNCTIONS
// ==========================================

function setPlayerPasscode() {
    const code = elements.adminPasscodeInput.value.trim();
    if (!/^\d{6}$/.test(code)) {
        alert('Please enter a valid 6-digit numeric passcode');
        return;
    }
    sharedState.playerPasscode = code;
    saveSharedState();
    elements.currentPasscode.textContent = code;
}

function updateAdminUI() {
    elements.currentPasscode.textContent = sharedState.playerPasscode || 'Not set';
    elements.currentPhase.textContent = sharedState.gamePhase;
    elements.adminCurrentRound.textContent = sharedState.currentRound;

    // Auto-end round logic
    checkAndEndRound();

    let status = 'Waiting';
    let dotClass = 'waiting';
    if (sharedState.isPaused) {
        status = 'Paused';
        dotClass = 'paused';
    } else if (sharedState.roundActive) {
        status = 'Round Active';
        dotClass = 'playing';
    } else if (sharedState.gamePhase !== 'lobby') {
        status = 'Waiting for Begin';
        dotClass = 'paused';
    }
    elements.gameStatus.textContent = status;
    elements.statusDot.className = 'status-dot ' + dotClass;

    const phase = sharedState.gamePhase;
    const roundActive = sharedState.roundActive;
    const isPaused = sharedState.isPaused;

    elements.adminStartLevel1Btn.disabled = phase !== 'lobby';

    // Begin Round: Show the NEXT round number if previous round has results
    if (phase === 'level1') {
        const nextRound = sharedState.roundResults.length > 0 ? sharedState.currentRound + 1 : sharedState.currentRound;
        const isLevelComplete = nextRound > CONFIG.LEVEL1_ROUNDS;
        elements.adminBeginRoundBtn.disabled = roundActive || isPaused || isLevelComplete;
        elements.adminBeginRoundBtn.textContent = isLevelComplete ? 'Level 1 Complete' : 'Begin Round ' + nextRound;
    } else if (phase === 'level2') {
        // Level 2: 6 rounds with increasing complexity
        const nextRound = sharedState.roundResults.length > 0 ? sharedState.currentRound + 1 : sharedState.currentRound;
        const isLevelComplete = nextRound > CONFIG.LEVEL2_ROUNDS;
        elements.adminBeginRoundBtn.disabled = roundActive || isPaused || isLevelComplete;
        elements.adminBeginRoundBtn.textContent = isLevelComplete ? 'Level 2 Complete' : 'Begin Memory Round ' + nextRound;
    } else {
        elements.adminBeginRoundBtn.disabled = true;
        elements.adminBeginRoundBtn.textContent = 'Begin Round';
    }

    elements.adminPauseGameBtn.disabled = !roundActive || isPaused;
    elements.adminResumeGameBtn.disabled = !isPaused;
    elements.adminEndLevel1Btn.disabled = phase !== 'level1' || roundActive;
    elements.adminStartLevel2Btn.disabled = phase !== 'intermission';

    // Show Final Results: Enable when all Level 2 rounds are complete
    const level2AllRoundsComplete = phase === 'level2' && sharedState.currentRound >= CONFIG.LEVEL2_ROUNDS;
    const level2RoundComplete = sharedState.roundResults.length >= sharedState.players.length && sharedState.players.length > 0;
    elements.adminResultsBtn.disabled = !(phase === 'level2' && level2AllRoundsComplete && (level2RoundComplete || !roundActive));

    renderAdminLeaderboard();
    renderAdminRoundResults();
}

function checkAndEndRound() {
    if (!sharedState.roundActive || sharedState.isPaused) return;
    if (sharedState.gamePhase !== 'level1' && sharedState.gamePhase !== 'level2') return;

    const playerCount = sharedState.players.length;
    const resultsCount = sharedState.roundResults.length;

    // Determine the round duration based on game phase
    let roundDuration;
    if (sharedState.gamePhase === 'level1') {
        // Level 1: Timer (15s) + Box Animation (1.5s) + Result Display (2.5s) + Buffer
        roundDuration = (CONFIG.LEVEL1_ROUND_TIME * 1000) +
                        CONFIG.BOX_OPEN_ANIMATION +
                        CONFIG.BOX_RESULT_DISPLAY +
                        CONFIG.ROUND_END_BUFFER;
    } else {
        // Level 2: Memory game uses round config time limit + Buffer
        const round = sharedState.currentRound || 1;
        const config = CONFIG.LEVEL2_ROUND_CONFIG[round] || CONFIG.LEVEL2_ROUND_CONFIG[1];
        roundDuration = (config.timeLimit * 1000) + CONFIG.ROUND_END_BUFFER;
    }

    const timeSinceStart = Date.now() - sharedState.roundStartTime;
    const timeExpired = timeSinceStart > roundDuration;
    const allPlayersActed = playerCount > 0 && resultsCount >= playerCount;

    // End round if all players have acted OR time has expired (with buffer)
    if (allPlayersActed || timeExpired) {
        sharedState.roundActive = false;
        saveSharedState();
    }
}

function adminStartLevel1() {
    sharedState.gamePhase = 'level1';
    sharedState.currentRound = 1;
    sharedState.roundActive = false;
    sharedState.roundResults = [];
    sharedState.isPaused = false;
    sharedState.players.forEach(p => {
        p.level1Score = 0;
        p.level2Score = 0;
        p.status = 'playing';
    });
    saveSharedState();
    updateAdminUI();
}

function adminBeginRound() {
    if (sharedState.gamePhase === 'level1') {
        // Level 1: Multiple rounds logic
        if (sharedState.roundResults.length > 0) {
            // Previous round was played, advance to next round
            sharedState.currentRound++;

            // Check if level is complete
            if (sharedState.currentRound > CONFIG.LEVEL1_ROUNDS) {
                adminEndLevel1();
                return;
            }
        }

        // Reset round results for new round
        sharedState.roundResults = [];
        sharedState.roundActive = true;
        sharedState.roundStartTime = Date.now();
        sharedState.isPaused = false;
        saveSharedState();
        updateAdminUI();
    } else if (sharedState.gamePhase === 'level2') {
        // Level 2: Multiple rounds with increasing complexity
        if (sharedState.roundResults.length > 0) {
            // Previous round was played, advance to next round
            sharedState.currentRound++;

            // Check if level is complete
            if (sharedState.currentRound > CONFIG.LEVEL2_ROUNDS) {
                adminShowFinalResults();
                return;
            }
        }

        // Reset round results for new round
        sharedState.roundResults = [];
        sharedState.roundActive = true;
        sharedState.roundStartTime = Date.now();
        sharedState.isPaused = false;
        saveSharedState();
        updateAdminUI();
    }
}

function adminPauseGame() {
    if (!sharedState.roundActive || sharedState.isPaused) return;
    sharedState.isPaused = true;
    sharedState.roundPauseTime = Date.now();
    saveSharedState();
    updateAdminUI();
}

function adminResumeGame() {
    if (!sharedState.isPaused) return;
    const pausedDuration = Date.now() - sharedState.roundPauseTime;
    sharedState.roundStartTime += pausedDuration;
    sharedState.isPaused = false;
    sharedState.roundPauseTime = null;
    saveSharedState();
    updateAdminUI();
}

function adminEndLevel1() {
    // End Level 1 immediately and go to intermission
    sharedState.roundActive = false;
    sharedState.isPaused = false;
    calculateQualification();
    sharedState.gamePhase = 'intermission';
    sharedState.currentRound = 1;
    saveSharedState();
    updateAdminUI();
}

function adminStartLevel2() {
    sharedState.gamePhase = 'level2';
    sharedState.currentRound = 1;
    sharedState.roundActive = false;
    sharedState.roundResults = [];
    sharedState.isPaused = false;
    saveSharedState();
    updateAdminUI();
}

function adminShowFinalResults() {
    sharedState.gamePhase = 'finished';
    sharedState.roundActive = false;
    sharedState.isPaused = false;
    saveSharedState();
    updateAdminUI();
}

function renderAdminLeaderboard() {
    const container = elements.adminLeaderboard;

    if (sharedState.players.length === 0) {
        container.innerHTML = '<p class="no-players">No players yet</p>';
        return;
    }

    const sorted = [...sharedState.players].sort((a, b) => {
        const totalA = (a.level1Score || 0) + (a.level2Score || 0);
        const totalB = (b.level1Score || 0) + (b.level2Score || 0);
        return totalB - totalA;
    });

    container.innerHTML = sorted.map((p, i) => {
        const total = (p.level1Score || 0) + (p.level2Score || 0);
        const rank = i + 1;
        const badge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
        return `
            <div class="leaderboard-row ${p.isQualified ? 'qualified' : ''}">
                <span class="leaderboard-rank">${badge}</span>
                <span class="leaderboard-name">${p.name}</span>
                <span class="leaderboard-score">L1: ${p.level1Score || 0} | L2: ${p.level2Score || 0} | Total: ${total}</span>
            </div>
        `;
    }).join('');
}

function renderAdminRoundResults() {
    const container = elements.adminRoundResults;

    if (sharedState.roundResults.length === 0) {
        container.innerHTML = '<p class="no-results">Waiting for players...</p>';
        return;
    }

    container.innerHTML = sharedState.roundResults.map(r => `
        <div class="player-result-row">
            <span class="player-name">${r.playerName}</span>
            <span class="player-outcome">
                <span>${r.emoji}</span>
                <span>${r.text}</span>
                <span style="color: ${r.points >= 0 ? 'var(--christmas-green)' : 'var(--christmas-red)'}">
                    ${r.points >= 0 ? '+' : ''}${r.points}
                </span>
            </span>
        </div>
    `).join('');
}

// ==========================================
// PLAYER LEADERBOARDS (Live on game screens)
// ==========================================

function updatePlayerLeaderboards() {
    const sorted = [...sharedState.players].sort((a, b) => {
        const totalA = (a.level1Score || 0) + (a.level2Score || 0);
        const totalB = (b.level1Score || 0) + (b.level2Score || 0);
        return totalB - totalA;
    });

    let youRowHtml = '';
    let otherRowsHtml = '';

    sorted.forEach((p, i) => {
        const total = (p.level1Score || 0) + (p.level2Score || 0);
        const rank = i + 1;
        const badge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
        const isYou = p.id === localState.playerId;
        const scoreDisplay = sharedState.gamePhase === 'level1'
            ? p.level1Score || 0
            : total;
        
        const rowHtml = `
            <div class="mini-leaderboard-row ${isYou ? 'you' : ''} ${rank <= 3 ? 'top3' : ''}">
                <span class="mini-rank">${badge}</span>
                <span class="mini-name">${p.name}${isYou ? ' (You)' : ''}</span>
                <span class="mini-score">${scoreDisplay}</span>
            </div>
        `;

        if (isYou) {
            youRowHtml = `
            <div class="mini-leaderboard-row you you-sticky">
                <span class="mini-rank">${badge}</span>
                <span class="mini-name">${p.name} (You)</span>
                <span class="mini-score">${scoreDisplay}</span>
            </div>
        `;
        } else {
            otherRowsHtml += rowHtml;
        }
    });

    const finalHtml = youRowHtml + otherRowsHtml;

    if (elements.level1Leaderboard) {
        elements.level1Leaderboard.innerHTML = finalHtml || '<p>No players</p>';
    }
    if (elements.level2Leaderboard) {
        elements.level2Leaderboard.innerHTML = finalHtml || '<p>No players</p>';
    }
}

// ==========================================
// LEVEL 1: GIFT UNWRAP (3 BOXES)
// ==========================================

function initLevel1UI() {
    localState.level1Score = 0;
    localState.roundHistory = [];
    localState.isFrozen = false;
    localState.hasActedThisRound = false;
    localState.roundInitialized = false;
    localState.lastRoundNumber = 0;
    localState.currentRoundResult = null;
    elements.level1Score.textContent = '0';
    elements.historyList.innerHTML = '';
    populateLevel1InfoPane();
}

function populateLevel1InfoPane() {
    const outcomes = CONFIG.OUTCOMES;
    let html = '';
    for (const key in outcomes) {
        const outcome = outcomes[key];
        let pointsClass = 'special';
        let pointsText = '';

        if (outcome.points > 0) {
            pointsClass = 'positive';
            pointsText = `+${outcome.points} pts`;
        } else if (outcome.points < 0) {
            pointsClass = 'negative';
            pointsText = `${outcome.points} pts`;
        } else if (outcome.multiplier) {
            pointsText = 'x2 Score';
        } else if (outcome.skipNext) {
            pointsText = 'Skip Round';
        }

        html += `
            <div class="info-row">
                <span>${outcome.emoji} ${outcome.name}</span>
                <span class="points ${pointsClass}">${pointsText}</span>
            </div>
        `;
    }
    elements.level1InfoContent.innerHTML = html;
}

function updateLevel1ForRound() {
    if (sharedState.isPaused) {
        clearInterval(roundTimer);
        return; // Stop further processing if paused
    }

    const currentRound = sharedState.currentRound;
    elements.currentRound.textContent = currentRound;
    elements.waitingRoundNum.textContent = currentRound;

    // Detect new round
    if (currentRound !== localState.lastRoundNumber) {
        localState.lastRoundNumber = currentRound;
        localState.hasActedThisRound = false;
        localState.roundInitialized = false;
        localState.currentRoundResult = null;
        clearInterval(roundTimer);
    }

    if (sharedState.roundActive) {
        // Round is active
        if (!localState.roundInitialized && !localState.hasActedThisRound) {
            // Initialize round (only once)
            if (localState.isFrozen) {
                showFrozenState();
            } else {
                showLevel1GameArea();
                startLevel1Timer();
            }
            localState.roundInitialized = true;
        } else if (localState.hasActedThisRound) {
            // Player has acted, show their result while waiting for round to end
            showLevel1Results();
        }
    } else {
        // Round is NOT active
        clearInterval(roundTimer);

        if (localState.hasActedThisRound || localState.currentRoundResult) {
            // Player acted OR has a result from this round - show results
            showLevel1Results();
        } else {
            // Waiting for host to begin
            showLevel1Waiting();
        }

        // Reset initialized flag for next round
        localState.roundInitialized = false;
    }
}

function showLevel1Waiting() {
    elements.level1RoundWaiting.style.display = 'flex';
    elements.level1GameArea.style.display = 'none';
    elements.level1RoundResults.style.display = 'none';
    if (elements.timerDisplay) elements.timerDisplay.style.visibility = 'hidden';
}

function showLevel1GameArea() {
    elements.level1RoundWaiting.style.display = 'none';
    elements.level1GameArea.style.display = 'flex';
    elements.level1RoundResults.style.display = 'none';
    if (elements.timerDisplay) elements.timerDisplay.style.visibility = 'visible';
    generateThreeBoxes();
}

function showLevel1Results() {
    elements.level1RoundWaiting.style.display = 'none';
    elements.level1GameArea.style.display = 'none';
    
    // Hide, clear, then show
    elements.level1RoundResults.style.display = 'none';
    elements.yourResultEmoji.textContent = '';
    elements.yourResultText.textContent = '';
    elements.yourResultPoints.textContent = '';
    elements.allPlayersResults.innerHTML = '';

    elements.resultsRoundNum.textContent = sharedState.currentRound;

    const result = localState.currentRoundResult;
    if (result) {
        elements.yourResultEmoji.textContent = result.emoji;
        elements.yourResultText.textContent = result.text;
        elements.yourResultPoints.textContent = result.points >= 0 ? '+' + result.points : result.points;
        elements.yourResultPoints.className = 'result-points ' + (result.points >= 0 ? 'positive' : 'negative');
    } else {
        const color = localState.lastBoxColor;
        const messages = {
            red: "A fiery red box! What will it be?",
            green: "A lucky green box! Hope it's not coal...",
            blue: "Is blue your favorite color? Let's see if it's a lucky one!",
            purple: "A mysterious purple box... interesting choice.",
            gold: "You went for the gold! A bold move."
        };
        const interimText = color ? messages[color] : "Let's see the results...";
        elements.yourResultText.textContent = interimText;
    }

    // Show all players results from shared state
    if (sharedState.roundResults.length > 0) {
        elements.allPlayersResults.innerHTML = sharedState.roundResults.map(r => `
        <div class="player-result-row ${r.playerId === localState.playerId ? 'you' : ''}">
            <span class="player-name">${r.playerName}${r.playerId === localState.playerId ? ' (You)' : ''}</span>
            <span class="player-outcome">
                <span>${r.emoji}</span>
                <span>${r.text}</span>
                <span style="color: ${r.points >= 0 ? 'var(--christmas-green)' : 'var(--christmas-red)'}">
                    ${r.points >= 0 ? '+' : ''}${r.points}
                </span>
            </span>
        </div>
        `).join('');
    } else {
        elements.allPlayersResults.innerHTML = '<p>Waiting for other players...</p>';
    }

    elements.level1RoundResults.style.display = 'block';
    if (elements.timerDisplay) elements.timerDisplay.style.visibility = 'hidden';
}

function showFrozenState() {
    elements.level1RoundWaiting.style.display = 'none';
    elements.level1GameArea.style.display = 'none';
    elements.level1RoundResults.style.display = 'none';
    elements.frozenOverlay.classList.add('show');
    localState.hasActedThisRound = true;

    // Auto-submit frozen result
    submitRoundResult({
        emoji: '🧊',
        text: 'Frozen!',
        points: 0
    });

    localState.isFrozen = false;

    setTimeout(() => {
        elements.frozenOverlay.classList.remove('show');
        showLevel1Results();
    }, 2000);
}

function generateThreeBoxes() {
    const container = elements.boxesContainer;
    container.innerHTML = '';

    const shuffledColors = [...CONFIG.BOX_COLORS].sort(() => Math.random() - 0.5).slice(0, 3);
    const boxOutcomes = shuffledColors.map(() => getRandomOutcome(sharedState.currentRound));

    shuffledColors.forEach((color, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'gift-box-wrapper';
        wrapper.dataset.index = index;

        wrapper.innerHTML = `
            <div class="gift-box ${color}">
                <div class="gift-lid"></div>
                <div class="gift-body">
                    <div class="gift-ribbon-v"></div>
                    <div class="gift-ribbon-h"></div>
                </div>
            </div>
            <div class="box-outcome">
                <span class="outcome-emoji"></span>
                <span class="outcome-text"></span>
                <span class="outcome-points"></span>
            </div>
            <div class="box-label">Box ${index + 1}</div>
        `;

        wrapper.addEventListener('click', () => handleBoxClick(wrapper, boxOutcomes[index], color));
        container.appendChild(wrapper);
    });
}

function getRandomOutcome(round) {
    let outcomes = JSON.parse(JSON.stringify(CONFIG.OUTCOMES));

    if (round >= 5 && round <= 8) {
        outcomes.COAL.probability = 0.15;
    } else if (round >= 9) {
        outcomes.COAL.probability = 0.20;
    }

    if (round >= 7) {
        outcomes.SMALL_GIFT.points = 15;
        outcomes.MEDIUM_GIFT.points = 35;
        outcomes.BIG_GIFT.points = 75;
        outcomes.JACKPOT.points = 150;
    }

    const total = Object.values(outcomes).reduce((sum, o) => sum + o.probability, 0);
    let rand = Math.random() * total;

    for (const [key, outcome] of Object.entries(outcomes)) {
        rand -= outcome.probability;
        if (rand <= 0) {
            return { ...outcome, key };
        }
    }

    return { ...outcomes.SMALL_GIFT, key: 'SMALL_GIFT' };
}

function handleBoxClick(wrapper, outcome, color) {
    if (localState.hasActedThisRound || wrapper.classList.contains('disabled') || sharedState.isPaused) return;

    localState.hasActedThisRound = true;
    localState.lastBoxColor = color;
    clearInterval(roundTimer);

    // Disable all boxes and start opening animation
    document.querySelectorAll('.gift-box-wrapper').forEach(w => w.classList.add('disabled'));
    wrapper.classList.add('opening');

    // Phase 1: Box lid opens (CONFIG.BOX_OPEN_ANIMATION)
    // Phase 2: After reveal delay, show the outcome
    setTimeout(() => {
        const outcomeEl = wrapper.querySelector('.box-outcome');
        outcomeEl.querySelector('.outcome-emoji').textContent = outcome.emoji;
        outcomeEl.querySelector('.outcome-text').textContent = outcome.name;

        let pointsText = '';
        let pointsClass = '';
        let actualPoints = outcome.points || 0;

        if (outcome.multiplier) {
            pointsText = 'Score x2!';
            pointsClass = 'special';
            localState.level1Score *= 2;
            actualPoints = localState.level1Score;
        } else if (outcome.skipNext) {
            pointsText = 'Skip next round';
            pointsClass = 'special';
            localState.isFrozen = true;
        } else if (outcome.points > 0) {
            pointsText = '+' + outcome.points;
            pointsClass = 'positive';
            localState.level1Score += outcome.points;
        } else {
            pointsText = outcome.points.toString();
            pointsClass = 'negative';
            localState.level1Score = Math.max(0, localState.level1Score + outcome.points);
        }

        outcomeEl.querySelector('.outcome-points').textContent = pointsText;
        outcomeEl.querySelector('.outcome-points').className = 'outcome-points ' + pointsClass;

        // Add reveal animation class
        wrapper.classList.add('revealed');
        outcomeEl.classList.add('show');

        elements.level1Score.textContent = localState.level1Score;

        // Show score popup after a moment
        setTimeout(() => {
            showScorePopup(pointsText, pointsClass);
        }, 300);

        addToHistory(outcome);

        submitRoundResult({
            emoji: outcome.emoji,
            text: outcome.name,
            points: outcome.points || 0
        });

        // Phase 3: Show results after displaying the outcome
        setTimeout(() => {
            showLevel1Results();
        }, CONFIG.BOX_RESULT_DISPLAY);

    }, CONFIG.BOX_OPEN_ANIMATION);
}

function handlePass() {
    if (localState.hasActedThisRound || sharedState.isPaused) return;

    localState.hasActedThisRound = true;
    localState.lastBoxColor = null; // Player didn't choose a box
    clearInterval(roundTimer);

    document.querySelectorAll('.gift-box-wrapper').forEach(w => w.classList.add('disabled'));

    // Show pass feedback
    showScorePopup('PASSED', 'neutral');

    addToHistory({ emoji: '⏭️', name: 'Passed', points: 0 });

    submitRoundResult({
        emoji: '⏭️',
        text: 'Passed',
        points: 0
    });

    // Show results after a brief moment
    setTimeout(() => {
        showLevel1Results();
    }, 1000);
}

function startLevel1Timer() {
    clearInterval(roundTimer);

    const roundDuration = CONFIG.LEVEL1_ROUND_TIME * 1000;
    
    const timerTick = () => {
        if (sharedState.isPaused) {
            clearInterval(roundTimer);
            return;
        }

        const timeElapsed = Date.now() - sharedState.roundStartTime;
        const timeLeftMs = roundDuration - timeElapsed;
        const timeLeftSec = timeLeftMs / 1000;
        
        updateTimerDisplay(Math.max(0, timeLeftSec), CONFIG.LEVEL1_ROUND_TIME);

        if (timeLeftMs <= 0) {
            clearInterval(roundTimer);
            if (!localState.hasActedThisRound) {
                handlePass();
            }
        }
    };

    roundTimer = setInterval(timerTick, 100);
    timerTick(); // Initial call
}

function updateTimerDisplay(timeLeft, maxTime) {
    const pct = (timeLeft / maxTime) * 100;
    elements.timerBar.style.width = pct + '%';
    elements.timerText.textContent = Math.ceil(timeLeft);
}

function addToHistory(outcome) {
    const item = document.createElement('div');
    item.className = 'history-item';

    if (outcome.multiplier || outcome.skipNext) {
        item.classList.add('special');
    } else if (outcome.points > 0) {
        item.classList.add('positive');
    } else if (outcome.points < 0) {
        item.classList.add('negative');
    } else {
        item.classList.add('neutral');
    }

    item.innerHTML = `
        <span>R${sharedState.currentRound}</span>
        <span>${outcome.emoji}</span>
        <span>${outcome.name}</span>
    `;

    elements.historyList.appendChild(item);
    localState.roundHistory.push(outcome);
}

async function submitRoundResult(result) {
    localState.currentRoundResult = result;

    try {
        const gameRef = doc(firestore, "game", "sharedState");
        await runTransaction(firestore, async (transaction) => {
            const gameDoc = await transaction.get(gameRef);
            if (!gameDoc.exists()) {
                throw "Game document does not exist!";
            }

            const data = gameDoc.data();
            
            // Update player score
            const newPlayers = data.players.map(p => {
                if (p.id === localState.playerId) {
                    return { ...p, level1Score: localState.level1Score };
                }
                return p;
            });

            // Add round result, preventing duplicates
            const newRoundResults = [...data.roundResults];
            const alreadySubmitted = newRoundResults.find(r => r.playerId === localState.playerId);
            if (!alreadySubmitted) {
                newRoundResults.push({
                    playerId: localState.playerId,
                    playerName: localState.playerName,
                    ...result
                });
            }

            transaction.update(gameRef, { 
                players: newPlayers, 
                roundResults: newRoundResults 
            });
        });
    } catch (error) {
        console.error("Failed to submit round result:", error);
        alert("Could not submit your result. Please check your connection.");
    }
}

// ==========================================
// INTERMISSION & QUALIFICATION
// ==========================================

function calculateQualification() {
    const sorted = [...sharedState.players].sort((a, b) => b.level1Score - a.level1Score);
    const qualifyCount = Math.ceil(sorted.length * (CONFIG.QUALIFICATION_PERCENT / 100));

    sharedState.players.forEach(p => {
        const idx = sorted.findIndex(s => s.id === p.id);
        p.isQualified = idx < qualifyCount;
    });

    saveSharedState();
}

function showIntermissionLeaderboard() {
    const player = sharedState.players.find(p => p.id === localState.playerId);
    const isQualified = player?.isQualified;

    elements.qualificationMessage.innerHTML = isQualified
        ? '🌟 <strong>Congratulations!</strong> You\'re in the Top 50%! Your Level 2 score will count!'
        : '🎮 You\'re in the bottom 50%, but you can still play Level 2 for fun!';

    const sorted = [...sharedState.players].sort((a, b) => b.level1Score - a.level1Score);

    elements.intermissionLeaderboard.innerHTML = sorted.map((p, i) => {
        const rank = i + 1;
        const badge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
        const isYou = p.id === localState.playerId;
        return `
            <div class="leaderboard-row ${p.isQualified ? 'qualified' : 'exhibition'} ${isYou ? 'you' : ''}">
                <span class="leaderboard-rank">${badge}</span>
                <span class="leaderboard-name">${p.name}${isYou ? ' (You)' : ''}</span>
                <span class="leaderboard-score">${p.level1Score}</span>
                <span class="leaderboard-badge">${p.isQualified ? '⭐' : ''}</span>
            </div>
        `;
    }).join('');
}


// ==========================================
// LEVEL 2: MEMORY MATCH GAME (6 ROUNDS)
// ==========================================

let level2Timer = null;
let level2StartTime = null;

function getRoundConfig() {
    const round = sharedState.currentRound || 1;
    return CONFIG.LEVEL2_ROUND_CONFIG[round] || CONFIG.LEVEL2_ROUND_CONFIG[1];
}

function initLevel2UI() {
    // Initialize overall Level 2 state (called once when entering Level 2)
    localState.level2Score = 0;
    localState.level2TotalTime = 0; // Total time across all rounds (for tiebreaker)
    localState.lastL2Round = 0;

    elements.level2Score.textContent = '0';

    populateLevel2InfoPane();
    resetLevel2RoundState();
}

function resetLevel2RoundState() {
    // Reset state for a new round
    const config = getRoundConfig();
    const totalPairs = config.cards / 2;

    localState.flipsLeft = config.maxFlips;
    localState.flipsUsed = 0;
    localState.pairsFound = 0;
    localState.totalPairs = totalPairs;
    localState.boardLocked = true;
    localState.firstCardFlipped = null;
    localState.secondCardFlipped = null;
    localState.level2RoundCompleted = false;
    localState.hasActedThisRound = false;
    localState.roundInitialized = false;
    localState.roundScore = 0;
    localState.roundTimeTaken = 0;
    localState.timeBonus = 0;
    level2StartTime = null;

    if (elements.flipsLeftHeader) elements.flipsLeftHeader.textContent = config.maxFlips;
    if (elements.pairsFoundHeader) elements.pairsFoundHeader.textContent = '0/' + totalPairs;
    if (elements.level2TimerText) elements.level2TimerText.textContent = config.timeLimit;
    if (elements.level2TimerBar) elements.level2TimerBar.style.width = '100%';
    if (elements.level2TimerDisplay) elements.level2TimerDisplay.style.visibility = 'hidden';
}

function populateLevel2InfoPane() {
    const round = sharedState.currentRound || 1;
    const config = getRoundConfig();
    const totalPairs = config.cards / 2;

    elements.level2InfoContent.innerHTML = `
        <div class="info-row" style="font-weight: bold; color: var(--gold);">
            <span>Round ${round} of 6</span>
            <span>${config.cards} cards</span>
        </div>
        <hr style="border-color: rgba(255,255,255,0.2); margin: 8px 0;">
        <div class="info-row">
            <span>Per Pair Found</span>
            <span class="points positive">+25 pts</span>
        </div>
        <div class="info-row">
            <span>All ${totalPairs} Pairs</span>
            <span class="points special">+${totalPairs * 25} pts</span>
        </div>
        <hr style="border-color: rgba(255,255,255,0.2); margin: 8px 0;">
        <div class="info-row">
            <span>Time Limit</span>
            <span>${config.timeLimit}s</span>
        </div>
        <div class="info-row">
            <span>Max Flips</span>
            <span>${config.maxFlips}</span>
        </div>
        <hr style="border-color: rgba(255,255,255,0.2); margin: 8px 0;">
        <div class="info-row" style="font-size: 0.85rem;">
            <span>Speed Bonus</span>
            <span class="points special">+Time pts</span>
        </div>
    `;
}

function updateLevel2ForRound() {
    if (sharedState.isPaused) {
        clearInterval(level2Timer);
        return;
    }

    const currentRound = sharedState.currentRound;

    // Update round display
    if (elements.level2CurrentRound) {
        elements.level2CurrentRound.textContent = currentRound;
    }

    // Detect new round
    if (currentRound !== localState.lastL2Round) {
        localState.lastL2Round = currentRound;
        resetLevel2RoundState();
        populateLevel2InfoPane();
    }

    if (sharedState.roundActive && !localState.level2RoundCompleted) {
        // Round is active
        if (!localState.roundInitialized) {
            showLevel2GameArea();
            startLevel2Timer();
            localState.roundInitialized = true;
        }
    } else {
        // Round is not active
        clearInterval(level2Timer);

        if (localState.level2RoundCompleted || localState.hasActedThisRound) {
            showLevel2Results();
        } else {
            showLevel2Waiting();
        }
    }
}

function showLevel2Waiting() {
    const round = sharedState.currentRound || 1;
    const config = getRoundConfig();

    elements.level2RoundWaiting.style.display = 'flex';
    if (elements.memoryGameContainer) elements.memoryGameContainer.style.display = 'none';
    if (elements.level2RoundResults) elements.level2RoundResults.style.display = 'none';
    if (elements.level2TimerDisplay) elements.level2TimerDisplay.style.visibility = 'hidden';

    // Update waiting text
    if (elements.level2WaitingText) {
        elements.level2WaitingText.innerHTML = `
            <strong>Round ${round} of 6</strong><br>
            ${config.cards} cards | ${config.timeLimit}s | ${config.maxFlips} flips<br>
            Waiting for host to begin...
        `;
    }
}

function showLevel2GameArea() {
    elements.level2RoundWaiting.style.display = 'none';
    if (elements.memoryGameContainer) elements.memoryGameContainer.style.display = 'block';
    if (elements.level2RoundResults) elements.level2RoundResults.style.display = 'none';
    if (elements.level2TimerDisplay) elements.level2TimerDisplay.style.visibility = 'visible';

    // Generate the memory board
    generateMemoryGameBoard();
    localState.boardLocked = false;
    level2StartTime = Date.now();
}

function showLevel2Results() {
    elements.level2RoundWaiting.style.display = 'none';
    if (elements.memoryGameContainer) elements.memoryGameContainer.style.display = 'none';
    if (elements.level2RoundResults) elements.level2RoundResults.style.display = 'block';
    if (elements.level2TimerDisplay) elements.level2TimerDisplay.style.visibility = 'hidden';

    // Show results
    const config = getRoundConfig();
    const totalPairs = config.cards / 2;
    const pairsFound = localState.pairsFound;
    const flipsUsed = localState.flipsUsed;
    const roundScore = localState.roundScore;
    const timeTaken = localState.roundTimeTaken;

    let resultText = '';
    let emoji = '🧠';

    if (pairsFound === totalPairs) {
        if (flipsUsed === totalPairs) {
            resultText = 'PERFECT! Amazing memory!';
            emoji = '🌟';
        } else if (flipsUsed <= totalPairs + 2) {
            resultText = 'Excellent! All pairs found!';
            emoji = '⭐';
        } else {
            resultText = 'Well done! All pairs found!';
            emoji = '🎁';
        }
    } else if (pairsFound >= totalPairs * 0.75) {
        resultText = 'Good effort! Almost there!';
        emoji = '🎄';
    } else if (pairsFound >= totalPairs * 0.5) {
        resultText = 'Nice try!';
        emoji = '🎁';
    } else {
        resultText = 'Keep practicing!';
        emoji = '❄️';
    }

    if (elements.level2ResultEmoji) elements.level2ResultEmoji.textContent = emoji;
    if (elements.level2ResultText) elements.level2ResultText.textContent = resultText + ` (${timeTaken.toFixed(1)}s)`;
    if (elements.level2ResultPoints) {
        elements.level2ResultPoints.textContent = '+' + roundScore;
        elements.level2ResultPoints.className = 'result-points positive';
    }
    if (elements.finalPairs) elements.finalPairs.textContent = pairsFound + '/' + totalPairs;
    if (elements.finalFlips) elements.finalFlips.textContent = flipsUsed;
}

function generateMemoryGameBoard() {
    const board = elements.memoryGameBoard;
    if (!board) return;
    board.innerHTML = '';

    const config = getRoundConfig();
    const numEmojis = config.emojis;

    // Select emojis for this round
    const selectedEmojis = CONFIG.MEMORY_EMOJIS.slice(0, numEmojis);
    const cards = [...selectedEmojis, ...selectedEmojis].sort(() => Math.random() - 0.5);

    // Set grid columns based on config
    board.style.gridTemplateColumns = `repeat(${config.cols}, 1fr)`;

    // Adjust card size based on number of cards
    const cardSize = config.cards <= 8 ? 120 : config.cards <= 16 ? 100 : 80;
    board.style.setProperty('--card-size', cardSize + 'px');

    cards.forEach((emoji, index) => {
        const card = document.createElement('div');
        card.className = 'memory-card';
        card.dataset.emoji = emoji;
        card.dataset.index = index;
        card.style.width = cardSize + 'px';
        card.style.height = cardSize + 'px';

        card.innerHTML = `
            <div class="card-face card-front">?</div>
            <div class="card-face card-back">${emoji}</div>
        `;

        card.addEventListener('click', handleCardClick);
        board.appendChild(card);
    });
}

function handleCardClick(e) {
    const clickedCard = e.currentTarget;

    // Check if clicking is allowed
    if (localState.boardLocked ||
        localState.level2RoundCompleted ||
        clickedCard.classList.contains('is-flipped') ||
        clickedCard.classList.contains('is-matched') ||
        clickedCard.classList.contains('is-vanishing') ||
        localState.firstCardFlipped === clickedCard ||
        sharedState.isPaused) {
        return;
    }

    clickedCard.classList.add('is-flipped');

    if (!localState.firstCardFlipped) {
        // First card of the pair
        localState.firstCardFlipped = clickedCard;
        return;
    }

    // Second card - use a flip
    localState.secondCardFlipped = clickedCard;
    localState.flipsLeft--;
    localState.flipsUsed++;
    updateLevel2Stats();

    checkForMatch();
}

function checkForMatch() {
    localState.boardLocked = true;
    const isMatch = localState.firstCardFlipped.dataset.emoji === localState.secondCardFlipped.dataset.emoji;

    if (isMatch) {
        handleMatchedCards();
    } else {
        unflipMismatchedCards();
    }
}

function handleMatchedCards() {
    const card1 = localState.firstCardFlipped;
    const card2 = localState.secondCardFlipped;

    // Show both cards matched for a moment
    card1.classList.add('is-matched');
    card2.classList.add('is-matched');

    localState.pairsFound++;
    updateLevel2Stats();

    // Add 2 seconds for every correct match
    localState.timeBonus += 2;

    // Calculate and show current round score
    calculateRoundScore();
    showScorePopup('+25 & +2s', 'positive');

    // Apply vanishing animation after showing the match
    setTimeout(() => {
        // Pick a random vanishing effect
        const effects = ['vanish-sparkle', 'vanish-shrink', 'vanish-dissolve', 'vanish-flip-away'];
        const effect = effects[Math.floor(Math.random() * effects.length)];

        card1.classList.add('is-vanishing', effect);
        card2.classList.add('is-vanishing', effect);

        // After animation, hide the cards completely
        setTimeout(() => {
            card1.style.visibility = 'hidden';
            card2.style.visibility = 'hidden';

            resetTurn();

            // Check if all pairs found
            if (localState.pairsFound === localState.totalPairs) {
                endLevel2Round(true);
            }
        }, 600);
    }, 400); // Show match for 400ms before vanishing
}

function unflipMismatchedCards() {
    // Add shake effect for mismatch
    localState.firstCardFlipped.classList.add('shake');
    localState.secondCardFlipped.classList.add('shake');

    setTimeout(() => {
        if (localState.firstCardFlipped) {
            localState.firstCardFlipped.classList.remove('is-flipped', 'shake');
        }
        if (localState.secondCardFlipped) {
            localState.secondCardFlipped.classList.remove('is-flipped', 'shake');
        }
        resetTurn();

        // Check if out of flips
        if (localState.flipsLeft === 0 && localState.pairsFound < localState.totalPairs) {
            setTimeout(() => endLevel2Round(false), 500);
        }
    }, 1000);
}

function resetTurn() {
    localState.firstCardFlipped = null;
    localState.secondCardFlipped = null;
    localState.boardLocked = false;
}

function updateLevel2Stats() {
    if (elements.flipsLeftHeader) elements.flipsLeftHeader.textContent = localState.flipsLeft;
    if (elements.pairsFoundHeader) elements.pairsFoundHeader.textContent = localState.pairsFound + '/' + localState.totalPairs;
}

function calculateRoundScore() {
    // Base score: 25 points per pair
    const baseScore = localState.pairsFound * 25;

    // Time bonus: Extra points for speed (calculated at end)
    localState.roundScore = baseScore;
}

function finalizeRoundScore() {
    const config = getRoundConfig();
    const totalPairs = config.cards / 2;
    const timeTaken = localState.roundTimeTaken;
    const timeLimit = config.timeLimit;

    // Base score
    let score = localState.pairsFound * 25;

    // If all pairs found, add time bonus
    if (localState.pairsFound === totalPairs) {
        // Time bonus: More time remaining = more bonus
        const timeRemaining = (timeLimit + localState.timeBonus) - timeTaken;
        const timeBonus = Math.max(0, Math.floor(timeRemaining * 2)); // 2 points per second remaining
        score += timeBonus;

        // Perfect flip bonus
        if (localState.flipsUsed === totalPairs) {
            score += 50; // Perfect - minimum flips
        } else if (localState.flipsUsed <= totalPairs + 2) {
            score += 25; // Near perfect
        }
    }

    localState.roundScore = score;
    localState.level2Score += score;
    elements.level2Score.textContent = localState.level2Score;

    // Store total time for tiebreaker
    localState.level2TotalTime += timeTaken;
}

function startLevel2Timer() {
    clearInterval(level2Timer);

    const config = getRoundConfig();
    const timeLimit = config.timeLimit;
    const startTime = Date.now();

    const timerTick = () => {
        if (sharedState.isPaused || localState.level2RoundCompleted) {
            clearInterval(level2Timer);
            return;
        }

        const elapsed = (Date.now() - startTime) / 1000;
        const newTimeLimit = timeLimit + localState.timeBonus;
        const timeLeft = Math.max(0, newTimeLimit - elapsed);

        // Update timer display
        const pct = (timeLeft / newTimeLimit) * 100;
        if (elements.level2TimerBar) elements.level2TimerBar.style.width = pct + '%';
        if (elements.level2TimerText) elements.level2TimerText.textContent = Math.ceil(timeLeft);

        if (timeLeft <= 0) {
            clearInterval(level2Timer);
            endLevel2Round(false); // Time ran out
        }
    };

    level2Timer = setInterval(timerTick, 100);
    timerTick(); // Initial call
}

function endLevel2Round(allPairsFound) {
    if (localState.level2RoundCompleted) return;

    localState.level2RoundCompleted = true;
    localState.hasActedThisRound = true;
    localState.boardLocked = true;
    clearInterval(level2Timer);

    // Calculate time taken
    if (level2StartTime) {
        localState.roundTimeTaken = (Date.now() - level2StartTime) / 1000;
    }

    // Finalize score with bonuses
    finalizeRoundScore();

    if (allPairsFound) {
        showScorePopup('Round Complete!', 'special');
    } else {
        showScorePopup('Time/Flips Out!', 'neutral');
    }

    // Submit result to shared state
    submitLevel2RoundResult();

    // Show results screen
    setTimeout(() => {
        showLevel2Results();
    }, 1000);
}

async function submitLevel2RoundResult() {
    try {
        const gameRef = doc(firestore, "game", "sharedState");
        await runTransaction(firestore, async (transaction) => {
            const gameDoc = await transaction.get(gameRef);
            if (!gameDoc.exists()) {
                throw "Game document does not exist!";
            }

            const data = gameDoc.data();

            // Update player's level 2 score and total time
            const newPlayers = data.players.map(p => {
                if (p.id === localState.playerId) {
                    return { 
                        ...p, 
                        level2Score: localState.level2Score,
                        level2Time: localState.level2TotalTime // Store total time for tiebreaker
                    };
                }
                return p;
            });

            // Add to round results, preventing duplicates
            const newRoundResults = [...data.roundResults];
            const alreadySubmitted = newRoundResults.find(r => r.playerId === localState.playerId);
            if (!alreadySubmitted) {
                newRoundResults.push({
                    playerId: localState.playerId,
                    playerName: localState.playerName,
                    emoji: localState.pairsFound === localState.totalPairs ? '🌟' : '🧠',
                    text: `${localState.pairsFound}/${localState.totalPairs} (${localState.roundTimeTaken.toFixed(1)}s)`,
                    points: localState.roundScore
                });
            }
            
            transaction.update(gameRef, { 
                players: newPlayers, 
                roundResults: newRoundResults 
            });
        });
    } catch (error) {
        console.error("Failed to submit Level 2 result:", error);
        alert("Could not submit your result. Please check your connection.");
    }
}


// ==========================================
// FINAL RESULTS
// ==========================================

function showFinalResults() {
    const sorted = [...sharedState.players].sort((a, b) => {
        const totalA = a.level1Score + (a.isQualified ? a.level2Score : 0);
        const totalB = b.level1Score + (b.isQualified ? b.level2Score : 0);

        // Primary sort: Total score (descending)
        if (totalB !== totalA) {
            return totalB - totalA;
        }

        // Tiebreaker: Total time (ascending - less time is better)
        const timeA = a.level2Time || 9999;
        const timeB = b.level2Time || 9999;
        return timeA - timeB;
    });

    elements.finalLeaderboard.innerHTML = sorted.map((p, i) => {
        const total = p.level1Score + (p.isQualified ? p.level2Score : 0);
        const timeStr = p.level2Time ? ` (${p.level2Time.toFixed(1)}s)` : '';
        const rank = i + 1;
        const badge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
        const isYou = p.id === localState.playerId;
        return `
            <div class="leaderboard-row ${p.isQualified ? 'qualified' : 'exhibition'} ${isYou ? 'you' : ''}">
                <span class="leaderboard-rank">${badge}</span>
                <span class="leaderboard-name">${p.name}${isYou ? ' (You)' : ''}</span>
                <span class="leaderboard-score">
                    L1: ${p.level1Score} | L2: ${p.level2Score}${timeStr}${!p.isQualified ? ' (Exh)' : ''} | Total: ${total}
                </span>
            </div>
        `;
    }).join('');

    revealWinners(sorted.filter(p => p.isQualified).slice(0, 3));
}

function revealWinners(winners) { // winners is sorted [1st, 2nd, 3rd]
    elements.winnerReveal.innerHTML = '';
    const medals = ['gold', 'silver', 'bronze'];
    const icons = ['🥇', '🥈', '🥉'];

    // Winner data with correct medals
    const winnerData = winners.map((w, i) => ({
        ...w,
        medal: medals[i],
        icon: icons[i],
        rank: i + 1
    }));

    // Reverse for reveal order (3rd, 2nd, 1st)
    winnerData.reverse();

    winnerData.forEach((winner, idx) => {
        // idx 0 is 3rd place, idx 1 is 2nd, etc.
        setTimeout(() => {
            const total = winner.level1Score + winner.level2Score;
            const card = document.createElement('div');
            card.className = `winner-card ${winner.medal}`;
            card.innerHTML = `
                <div class="winner-rank">${winner.icon}</div>
                <div class="winner-name">${winner.name}</div>
                <div class="winner-score">${total} points</div>
            `;
            elements.winnerReveal.prepend(card); // Prepend to keep order 1, 2, 3
            triggerConfetti();
        }, idx * 3000); // Reveal every 3 seconds
    });
}

// ==========================================
// EFFECTS
// ==========================================

function showScorePopup(text, type) {
    elements.scorePopup.textContent = text;
    elements.scorePopup.className = 'score-popup show ' + type;
    setTimeout(() => elements.scorePopup.classList.remove('show'), 1000);
}

function triggerConfetti() {
    const colors = ['#c41e3a', '#228b22', '#ffd700', '#ff6b6b', '#4ecdc4'];
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 2 + 's';
        elements.confettiContainer.appendChild(confetti);
        setTimeout(() => confetti.remove(), 5000);
    }
}

// ==========================================
// RESET
// ==========================================

function resetGame() {
    clearInterval(roundTimer);
    clearInterval(minigameTimer);
    clearInterval(luckMeterAnimator);
    clearInterval(level2Timer);

    sharedState = {
        gamePhase: 'lobby',
        playerPasscode: sharedState.playerPasscode,
        currentRound: 1,
        roundActive: false,
        roundStartTime: null,
        isPaused: false,
        roundPauseTime: null,
        players: [],
        roundResults: []
    };

    localState = {
        isAdmin: localState.isAdmin,
        playerId: '',
        playerName: '',
        level1Score: 0,
        level2Score: 0,
        currentRoundResult: null,
        isFrozen: false,
        roundHistory: [],
        hasActedThisRound: false,
        roundInitialized: false,
        lastRoundNumber: 0,
        // Level 2 memory game state
        flipsLeft: CONFIG.LEVEL2_MAX_FLIPS,
        flipsUsed: 0,
        pairsFound: 0,
        boardLocked: true,
        firstCardFlipped: null,
        secondCardFlipped: null,
        level2Completed: false,
        level2TimeRemaining: CONFIG.LEVEL2_TIME_LIMIT
    };

    saveSharedState();

    elements.historyList.innerHTML = '';
    elements.winnerReveal.innerHTML = '';
    elements.finalLeaderboard.innerHTML = '';
    elements.confettiContainer.innerHTML = '';

    if (localState.isAdmin) {
        showScreen('admin');
        updateAdminUI();
    } else {
        showScreen('login');
    }
}
