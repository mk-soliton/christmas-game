# 🎄 Christmas Fest Online Game - Complete Specification

## Project Overview

Build a **two-level Christmas-themed game** for a virtual team celebration. The game combines "Gift Unwrap Roulette" (Level 1 - luck-based) and "Christmas Memory Match" (Level 2 - skill-based) into a single web application with admin controls, real-time leaderboards, and festive UI.

**Target:** 20-50 players | **Duration:** ~15-20 minutes | **Platform:** Static hosting (Netlify/Vercel)

---

## 🎯 Game Flow Summary

```
Player Entry (6-digit passcode) → Level 1: Gift Unwrap → Leaderboard (Top 50% highlighted)
                                                              ↓
                                        Level 2: Memory Match (all play, only top 50% scores count)
                                                              ↓
                                        Final Leaderboard → Top 3 Winners Revealed
```

---

## 🔐 Authentication System

### Player Entry
- **Passcode:** 6-digit numeric code (e.g., `482916`)
- Admin generates this code and shares during the Teams meeting
- Players enter:
  1. Their **Name** (display name for leaderboard)
  2. **6-digit Passcode**
- On valid passcode → Enter waiting lobby until admin starts game

### Admin Entry
- **Admin Passcode:** `Manoj@orgteam` (static, hardcoded)
- Admin sees a completely different dashboard with controls
- Admin does NOT play the game

---

## 🎁 Level 1: Christmas Gift Unwrap Roulette

### Concept
Players see wrapped gift boxes. Each round, they choose to **UNWRAP** or **PASS**. Unwrapping reveals random outcomes. Risk increases each round but so do rewards.

### Game Mechanics

#### Rounds: 10 rounds total

#### Outcomes (randomized per unwrap):
| Outcome | Probability | Effect |
|---------|-------------|--------|
| 🎁 Small Gift | 30% | +10 points |
| 🎄 Medium Gift | 25% | +25 points |
| ⭐ Big Gift | 15% | +50 points |
| 🌟 Jackpot | 5% | +100 points |
| 💎 Multiplier (2x) | 10% | Double current score |
| 🧊 Freeze | 5% | Skip next round |
| 💀 Coal | 10% | -30 points (min 0) |

#### Risk Escalation:
- Rounds 1-3: Coal probability 10%
- Rounds 4-6: Coal probability 15%
- Rounds 7-10: Coal probability 20%
- Reward values increase proportionally

#### Player Actions:
- **UNWRAP:** Take the risk, reveal outcome
- **PASS:** Skip this round, no points gained/lost

#### Timing:
- Each round: **5 seconds** to decide
- Auto-PASS if no selection
- Brief animation between rounds (**2 seconds**)
- Total Level 1 duration: **~6-8 minutes**

### UI Elements for Level 1:
- Large 3D-style gift box (CSS only, no complex libs)
- Unwrap animation (box opens, item flies out)
- Current score display (prominent)
- Round counter (Round X/10)
- Timer countdown bar (visual urgency)
- Two large buttons: "🎁 UNWRAP" and "⏭️ PASS"
- History panel showing this round's results

---

## 🧠 Level 2: Christmas Memory Match

### Concept
A classic memory card matching game with Christmas-themed emojis. Players flip cards to find matching pairs within limited attempts. Tests memory and observation skills.

### Game Mechanics

#### Card Setup:
- **8 cards total** arranged in a 4x2 grid (4 columns, 2 rows)
- **4 unique Christmas emoji pairs** (each emoji appears exactly twice)
- Cards are shuffled randomly at game start for each player

#### Christmas Emojis (4 pairs):
| Emoji | Name |
|-------|------|
| 🎄 | Christmas Tree |
| 🎅 | Santa Claus |
| ⭐ | Star |
| 🎁 | Gift Box |

> **Note:** These 4 emojis are used. Each appears twice = 8 cards total.

#### Gameplay Flow:
1. All 8 cards start face-down (showing card back design)
2. Player clicks first card → Card flips to reveal emoji
3. Player clicks second card → Card flips to reveal emoji
4. **Match Check:**
   - ✅ **If both emojis match:** Both cards stay face-up (matched), player continues
   - ❌ **If emojis don't match:** Both cards flip back face-down after 1 second delay
5. Each flip of 2 cards = **1 attempt** used
6. Game continues until all pairs found OR attempts exhausted

#### Attempts & Scoring:
- **Total Attempts:** 10 flips (clicking 2 cards = 1 flip/attempt)
- **Scoring based on pairs found:**

| Pairs Found | Points Awarded | Description |
|-------------|----------------|-------------|
| 1 pair | 25 points | Found 1 of 4 pairs |
| 2 pairs | 50 points | Found 2 of 4 pairs |
| 3 pairs | 75 points | Found 3 of 4 pairs |
| 4 pairs (all) | 100 points | Perfect! All pairs found |

#### Bonus Points (Speed Bonus):
- If all 4 pairs found with **≤6 attempts:** +25 bonus points (total: 125)
- If all 4 pairs found with **≤5 attempts:** +50 bonus points (total: 150)
- If all 4 pairs found with **4 attempts (perfect):** +75 bonus points (total: 175)

#### Edge Cases & Rules:
1. **Cannot click same card twice:** If player clicks an already face-up card, nothing happens (no penalty)
2. **Already matched cards:** Clicking matched cards does nothing
3. **Timer per game:** 60 seconds total for Level 2 (if time runs out, score based on pairs found)
4. **No click during flip animation:** Disable clicks during the 1-second reveal/hide animation
5. **Minimum 4 attempts needed:** Even with perfect memory, 4 attempts minimum to find all pairs

#### Visual States for Cards:
1. **Face-down:** Shows decorative card back (snowflake pattern or Christmas design)
2. **Face-up (revealed):** Shows the emoji
3. **Matched:** Shows emoji with subtle glow/highlight effect, stays visible
4. **Mismatched (briefly):** Both cards shown for 1 second before flipping back

### UI Elements for Level 2:
- 4x2 card grid (responsive, centered)
- Card flip animation (CSS 3D transform)
- Decorative card backs with Christmas pattern
- Large, clear emojis on card faces
- Attempts remaining counter: "Flips: X/10"
- Pairs found indicator: "Pairs: X/4" with visual checkmarks
- Timer countdown: "Time: XX seconds"
- Current score display
- Visual feedback on match (green glow) / mismatch (red flash)

### Timing:
- Card flip animation: 0.3 seconds
- Mismatch display time: 1 second before flip back
- Match celebration: 0.5 seconds
- Total Level 2 duration: **~3-5 minutes per player** (capped at 60 seconds)

---

## 📊 Leaderboard System

### After Level 1:
- Show all players ranked by score
- **Top 50%:** Highlighted with gold/green background, star badge ⭐
- **Bottom 50%:** Normal display, subtle "For Fun" tag
- Transition message: "Top 50% advance! But everyone keeps playing!"

### After Level 2 (Final):
- Combined score (Level 1 + Level 2) for Top 50% players
- Bottom 50% shown separately (their L2 scores displayed but marked as "exhibition")
- **Winner Reveal Animation:**
  1. Dim the board
  2. Reveal #3 with bronze effect 🥉 + confetti
  3. Pause 3 seconds
  4. Reveal #2 with silver effect 🥈 + confetti
  5. Pause 3 seconds
  6. Reveal #1 with gold effect 🥇 + major confetti + celebration

### Leaderboard UI:
- Player name
- Level 1 score
- Level 2 score
- Total score
- Rank badge (🥇🥈🥉 for top 3)
- Visual distinction for qualified vs exhibition players

---

## 🎛️ Admin Dashboard

### Access: Enter `Manoj@orgteam` as passcode

### Admin Controls:

#### Game Management:
- **Set Player Passcode:** Input field to set the 6-digit code players will use
- **Start Game:** Begin Level 1 for all players
- **Pause Game:** Freeze all player screens mid-round
- **Resume Game:** Continue from pause
- **Restart Level:** Reset current level for all players
- **Restart Entire Game:** Full reset, clear all scores

#### View Controls:
- **Spectate Mode:** See a player's screen (dropdown to select player)
- **Live Leaderboard:** Real-time scores updating
- **Player List:** See all connected players + their status (waiting/playing/finished)

#### Level Transitions:
- **End Level 1:** Manually trigger (or auto after round 10)
- **Start Level 2:** Begin memory match for all players
- **Show Final Results:** Trigger winner reveal ceremony

### Admin UI:
- Split screen: Controls on left, live feed on right
- Player count indicator
- Current game state indicator (Waiting/Level 1/Intermission/Level 2/Finished)
- Emergency "Reset All" button (with confirmation)

---

## 🎨 Design Requirements

### Theme: Festive Christmas / Winter Wonderland

### Color Palette:
```css
--christmas-red: #c41e3a;
--christmas-green: #228b22;
--gold: #ffd700;
--snow-white: #fffafa;
--night-blue: #1a1a2e;
--frost: #e0f7fa;
--card-back: #2d5a27; /* Deep green for card backs */
```

### Typography:
- Headers: "Mountains of Christmas" (Google Font) or similar festive font
- Body: "Quicksand" or "Nunito" (clean, readable)

### Visual Elements:
- Falling snow animation (CSS only, lightweight)
- Subtle sparkle effects on buttons
- Gift box with ribbon (CSS gradients/shadows)
- Card flip with 3D perspective
- Confetti for celebrations (CSS or lightweight JS)

### Animations (CSS-based):
- Gift unwrap: Scale + rotate + fade
- Card flip: rotateY 180deg with backface-visibility
- Match found: Scale pulse + glow
- Mismatch: Shake + red flash
- Score popup: Scale bounce + fade
- Confetti: Keyframe falling particles

### Card Design:
- **Card Back:** Dark green with snowflake/star pattern, subtle border
- **Card Front:** White/cream background, large centered emoji
- **Matched State:** Green border glow
- **Hover State:** Slight lift shadow (only on face-down cards)

### Responsive:
- Desktop-first (most players on laptop during Teams call)
- Mobile-friendly for phone joiners
- Min-width support: 320px
- Card grid adapts: 4x2 on desktop, can stack on very small screens

---

## 🏗️ Technical Architecture

### Stack:
- **Frontend:** React (single JSX file for artifact compatibility) OR vanilla HTML/CSS/JS
- **State:** Browser localStorage for persistence + in-memory for real-time
- **Real-time Sync:** Use polling (every 2s) to a simple JSON state on server, OR use Anthropic API for state if needed
- **Hosting:** Netlify/Vercel (static files only)

### File Structure (if multi-file):
```
/
├── index.html
├── styles.css
├── app.js
├── assets/
│   └── (any downloaded images/sounds)
└── README.md
```

### For Single-File React Artifact:
- Everything in one .jsx file
- Use React hooks (useState, useEffect)
- Tailwind for styling
- No external dependencies except allowed ones (lucide-react for icons)

### State Management:

```javascript
// Game State Structure
{
  gamePhase: 'waiting' | 'level1' | 'intermission' | 'level2' | 'finished',
  playerPasscode: '482916', // Set by admin
  players: [
    {
      id: 'uuid',
      name: 'Player Name',
      level1Score: 0,
      level2Score: 0,
      isQualified: false, // Top 50% flag
      currentRound: 1,
      status: 'waiting' | 'playing' | 'finished'
    }
  ],
  currentRound: 1,
  isPaused: false,
  level1Results: [], // History
  level2Results: []
}

// Level 2 Memory Game State (per player)
{
  cards: [
    { id: 0, emoji: '🎄', isFlipped: false, isMatched: false },
    { id: 1, emoji: '🎅', isFlipped: false, isMatched: false },
    // ... 8 cards total
  ],
  firstCard: null, // Currently selected first card
  secondCard: null, // Currently selected second card
  attemptsUsed: 0,
  pairsFound: 0,
  isLocked: false, // Prevent clicks during animation
  timeRemaining: 60,
  score: 0
}
```

### Memory Game Logic:

```javascript
// Shuffle cards at game start
function shuffleCards() {
  const emojis = ['🎄', '🎅', '⭐', '🎁'];
  const pairs = [...emojis, ...emojis]; // Duplicate for pairs
  return pairs
    .sort(() => Math.random() - 0.5)
    .map((emoji, index) => ({
      id: index,
      emoji,
      isFlipped: false,
      isMatched: false
    }));
}

// Handle card click
function handleCardClick(cardId) {
  if (isLocked) return; // Animation in progress
  if (cards[cardId].isFlipped) return; // Already flipped
  if (cards[cardId].isMatched) return; // Already matched
  
  // Flip the card
  flipCard(cardId);
  
  if (firstCard === null) {
    // First card of the pair
    setFirstCard(cardId);
  } else {
    // Second card - check for match
    setSecondCard(cardId);
    setAttemptsUsed(prev => prev + 1);
    checkForMatch(firstCard, cardId);
  }
}

// Check if two cards match
function checkForMatch(card1Id, card2Id) {
  setIsLocked(true);
  
  if (cards[card1Id].emoji === cards[card2Id].emoji) {
    // Match found!
    markAsMatched(card1Id, card2Id);
    setPairsFound(prev => prev + 1);
    resetSelection();
    setIsLocked(false);
  } else {
    // No match - flip back after delay
    setTimeout(() => {
      flipBack(card1Id, card2Id);
      resetSelection();
      setIsLocked(false);
    }, 1000);
  }
}

// Calculate final score
function calculateScore(pairsFound, attemptsUsed) {
  const baseScore = pairsFound * 25; // 25, 50, 75, or 100
  
  if (pairsFound === 4) { // All pairs found
    if (attemptsUsed === 4) return baseScore + 75; // Perfect: 175
    if (attemptsUsed === 5) return baseScore + 50; // Excellent: 150
    if (attemptsUsed <= 6) return baseScore + 25; // Great: 125
  }
  
  return baseScore;
}
```

### Persistence Strategy:
Since this is a simple static deploy without backend:

**Option A (Recommended for simplicity):**
- Single shared browser tab acts as "server" (admin's browser)
- Players poll admin's state via BroadcastChannel API (same origin only)
- Limitation: All must be on same network/origin

**Option B (For distributed):**
- Use a free real-time database like Firebase Realtime DB or Supabase
- Requires setup but enables true multi-device

**Option C (Simplest - Demo mode):**
- Each player plays independently
- Admin manually collects scores via screen share
- Leaderboard is manually updated

**Recommendation:** Start with Option C for guaranteed functionality, enhance to A/B if time permits.

---

## 📦 External Resources (Free)

### Images (use via CDN or download):
- Gift boxes: https://www.flaticon.com/free-icons/gift
- Christmas items: https://www.flaticon.com/packs/christmas-90
- Card back patterns: Create with CSS or find on Freepik

### Fonts (Google Fonts):
```html
<link href="https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@400;700&family=Quicksand:wght@400;600;700&display=swap" rel="stylesheet">
```

### Icons:
- Lucide React (already available in artifacts)
- Or Font Awesome via CDN

### Sound Effects (optional):
- Freesound.org for card flip, match sound, victory fanfare
- Keep sounds short (<1 second) for quick feedback

---

## ✅ Pre-Development Checklist

Before starting development:

- [ ] Decide on deployment approach (Netlify vs Vercel)
- [ ] Choose state management strategy (Option A/B/C from above)
- [ ] Download any required images/assets to `/assets` folder
- [ ] Set up Google Fonts link
- [ ] Create Netlify/Vercel account if not existing
- [ ] Test basic deployment with a "Hello World" page first

---

## 📋 Development Phases

### Phase 1: Foundation & Authentication (Priority: HIGH)
**Goal:** Working login system + basic game shell

**Tasks:**
1. Create HTML structure with entry form
2. Implement passcode validation logic
3. Build player entry flow (name + passcode)
4. Build admin entry detection (`Manoj@orgteam`)
5. Create waiting lobby UI for players
6. Create admin dashboard shell
7. Set up basic CSS with Christmas theme
8. Add falling snow background animation

**Deliverable:** Players can enter with passcode, admin can access dashboard, everyone sees festive UI

---

### Phase 2: Level 1 - Gift Unwrap Game (Priority: HIGH)
**Goal:** Fully playable Level 1

**Tasks:**
1. Build gift box component with CSS styling
2. Implement unwrap animation (CSS keyframes)
3. Create outcome randomization logic with probability weights
4. Build round timer (5 seconds) with visual countdown
5. Implement UNWRAP and PASS button actions
6. Create score calculation logic with risk escalation
7. Build round history display
8. Add score popup animations
9. Implement round transitions (2 second gap)
10. Add admin controls: Start Level 1, Pause, Resume
11. Store player scores in state

**Deliverable:** Complete Level 1 gameplay loop with all 10 rounds

---

### Phase 3: Level 2 - Memory Match Game + Leaderboard (Priority: HIGH)
**Goal:** Fully playable Level 2 + complete leaderboard system

**Tasks:**
1. Build card component with front/back faces
2. Implement CSS 3D card flip animation
3. Create 4x2 card grid layout
4. Implement card shuffle logic at game start
5. Build card click handler with validation
6. Implement match detection logic
7. Add mismatch flip-back with 1 second delay
8. Build attempts counter (10 flips max)
9. Build pairs found tracker (0-4)
10. Implement 60-second game timer
11. Calculate score with bonus points
12. Add visual feedback (match glow, mismatch shake)
13. Add admin controls: Start Level 2, End Level 2
14. Implement intermission leaderboard (post Level 1)
15. Calculate Top 50% qualification
16. Build final leaderboard with combined scores
17. Implement winner reveal animation sequence
18. Add confetti celebration effects

**Deliverable:** Complete Level 2 + all leaderboard functionality

---

### Phase 4: Polish & Admin Features (Priority: MEDIUM)
**Goal:** Full admin control + visual polish

**Tasks:**
1. Complete admin dashboard layout
2. Implement spectate mode (if feasible)
3. Add restart level functionality
4. Add restart game functionality
5. Build player list view for admin
6. Add sound effects (optional)
7. Polish all animations and transitions
8. Mobile responsiveness fixes
9. Error handling and edge cases
10. Final testing with multiple browser tabs
11. Prepare deployment build
12. Deploy to Netlify/Vercel
13. Test deployed version

**Deliverable:** Production-ready game deployed and tested

---

## 🔧 Implementation Notes for Claude Code

### Keep Code Simple:
- Prefer vanilla CSS over complex animations libraries
- Use CSS variables for theming
- Keep JavaScript functions small and focused
- Comment complex logic blocks

### Card Flip CSS (Key Implementation):

```css
/* Card container */
.card {
  width: 80px;
  height: 100px;
  perspective: 1000px;
  cursor: pointer;
}

/* Inner card that flips */
.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.3s;
  transform-style: preserve-3d;
}

/* Flipped state */
.card.flipped .card-inner {
  transform: rotateY(180deg);
}

/* Front and back faces */
.card-front, .card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 8px;
}

/* Back face (default visible) */
.card-back {
  background: var(--card-back);
  /* Add snowflake pattern */
}

/* Front face (emoji side) */
.card-front {
  background: white;
  transform: rotateY(180deg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
}

/* Matched state */
.card.matched .card-inner {
  box-shadow: 0 0 15px var(--christmas-green);
}
```

### Performance:
- Minimize re-renders in React
- Use CSS animations over JS where possible
- Lazy load any heavy assets

### Error Handling:
- Graceful fallback if localStorage unavailable
- Handle network issues for multi-device setups
- Validate all user inputs
- Prevent rapid clicking during animations (isLocked state)

### Testing Approach:
- Test with multiple browser tabs as different "players"
- Test admin controls affect all player views
- Test edge cases: 0 players, 1 player, max players
- Test memory game: rapid clicking, timeout scenarios

---

## 🎮 Quick Reference - Key Constants

```javascript
// Game Configuration
const CONFIG = {
  PLAYER_PASSCODE: '', // Set by admin at runtime
  ADMIN_PASSCODE: 'Manoj@orgteam',
  
  // Level 1 Settings
  LEVEL1_ROUNDS: 10,
  LEVEL1_ROUND_TIME: 5, // seconds
  LEVEL1_TRANSITION_TIME: 2, // seconds between rounds
  
  // Level 2 Settings
  LEVEL2_TOTAL_CARDS: 8,
  LEVEL2_PAIRS: 4,
  LEVEL2_MAX_ATTEMPTS: 10,
  LEVEL2_TIME_LIMIT: 60, // seconds
  LEVEL2_FLIP_DELAY: 1000, // ms before mismatch flips back
  
  QUALIFICATION_PERCENT: 50, // Top 50% qualify
  
  // Level 1 Outcomes
  OUTCOMES: {
    SMALL_GIFT: { points: 10, probability: 0.30, emoji: '🎁' },
    MEDIUM_GIFT: { points: 25, probability: 0.25, emoji: '🎄' },
    BIG_GIFT: { points: 50, probability: 0.15, emoji: '⭐' },
    JACKPOT: { points: 100, probability: 0.05, emoji: '🌟' },
    MULTIPLIER: { points: 0, multiplier: 2, probability: 0.10, emoji: '💎' },
    FREEZE: { points: 0, skipNext: true, probability: 0.05, emoji: '🧊' },
    COAL: { points: -30, probability: 0.10, emoji: '💀' }
  },
  
  // Level 2 Card Emojis
  MEMORY_EMOJIS: ['🎄', '🎅', '⭐', '🎁'],
  
  // Level 2 Scoring
  MEMORY_SCORING: {
    PER_PAIR: 25, // 25 points per pair found
    BONUS_6_ATTEMPTS: 25, // +25 if completed in ≤6 attempts
    BONUS_5_ATTEMPTS: 50, // +50 if completed in ≤5 attempts
    BONUS_PERFECT: 75 // +75 if completed in exactly 4 attempts
  }
};
```

---

## 📞 Support Notes

- If state sync issues occur, fall back to "demo mode" (Option C)
- Admin should keep their browser tab open throughout
- Recommend Chrome/Edge for best compatibility
- If animations lag, reduce snow particle count
- Memory game: If cards don't flip back, check isLocked state

---

## 🎯 Game Duration Summary

| Phase | Duration |
|-------|----------|
| Player Entry & Waiting | 2-3 min |
| Level 1: Gift Unwrap (10 rounds × 7 sec) | ~6-8 min |
| Intermission / Leaderboard | 1-2 min |
| Level 2: Memory Match | 3-5 min |
| Final Results & Winner Reveal | 2-3 min |
| **Total** | **~15-20 min** |

---

**Ready to build! Start with Phase 1 and progress sequentially. Each phase should be testable independently before moving to the next.**

🎄 **Good luck and Happy Holidays!** 🎄