# TYPING FIGHTER

A 2D online multiplayer **typing fighting game** — two players (or one player vs AI)
type words as fast and accurately as possible to land attacks and reduce their
opponent's HP to zero before the clock runs out.

Built with **Phaser 3** on the frontend and **Node.js + Socket.IO** on the backend.
There is **no database** — all match state lives in server memory only while a
match is running, and is discarded when the match ends.

Everything you see — characters, animations, arena, effects, sounds — is
generated procedurally in code (Phaser Graphics shapes + Web Audio synthesis).
There are no external art or audio asset files, so there's nothing to license,
download, or swap out, and it stays lightweight.

---

## Features

- **1v1 real-time typing combat** — no attack buttons, only your typing skill
- **Server-authoritative combat** — the server validates word correctness, timing,
  and computes damage; clients cannot fake damage or HP
- **Skill-based damage formula** — base damage + speed bonus + accuracy bonus +
  combo bonus, capped so no single hit can be overwhelming; mistakes hurt you
- **Combo system** with escalating visual feedback and combo-breaking on typos
- **Special power words** (FIRE, THUNDER, SHADOW, STORM...) trigger bonus damage
  and a unique visual burst
- **Two original shadow-silhouette fighters** (Ronin & Brute archetypes),
  fully procedurally drawn, each with idle / ready / attack / hit / victory /
  defeat animations built from tweened body parts
- **Cinematic original arena** — parallax skyline, temple pillars, drifting
  particles, dynamic lighting — all drawn in code
- **3 match lengths**: 2 / 5 / 10 minutes
- **Online multiplayer** via room codes (create/join, no accounts required)
- **Offline Practice Mode** vs an AI opponent with 4 difficulty levels
- **Full menu flow**: Main Menu → Mode Select → Lobby → Waiting Room →
  Countdown → Fight → Result
- **Synthesized audio** (Web Audio API) for keystrokes, hits, criticals, combos,
  countdown, victory/defeat, and ambient music — with independent Music/SFX
  volume sliders in Settings
- Responsive scaling so it works across common desktop window sizes
  (desktop keyboard is the primary input target, as requested)

---

## Project Structure

```
typing-fighter/
│
├── client/                  # Everything served to the browser
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── main.js          # Phaser config/bootstrap
│       ├── scenes/          # BootScene, MainMenuScene, ModeSelectScene,
│       │                    # HowToPlayScene, SettingsScene, LobbyScene,
│       │                    # WaitingScene, FightScene, ResultScene
│       ├── entities/        # Fighter (procedural silhouette + animations),
│       │                    # Arena (background), EffectsManager (juice)
│       ├── systems/         # TypingSystem, SoundManager, NetworkClient,
│       │                    # AIOpponent, WordList, CombatCalc (offline mirror)
│       └── ui/               # UIKit shared menu/button/HP-bar helpers
│
├── server/
│   ├── server.js            # Express static hosting + Socket.IO bootstrap
│   ├── game/
│   │   ├── words.js         # Categorized word bank (easy/medium/hard/expert/special)
│   │   └── combat.js        # Authoritative damage calculation
│   ├── rooms/
│   │   ├── Room.js          # Single-match in-memory state machine
│   │   └── RoomManager.js   # Tracks all active rooms (memory only)
│   └── networking/
│       └── socketHandlers.js # All Socket.IO event wiring
│
├── package.json
└── README.md
```

---

## Requirements

- [Node.js](https://nodejs.org) v16 or later (includes npm)
- A modern browser: Chrome, Edge, or Firefox

## Install & Run

From the `typing-fighter/` project root:

```bash
npm install
npm start
```

Then open your browser to:

```
http://localhost:3000
```

That's it — one server process handles both the static client files and the
Socket.IO multiplayer connection. No separate client/server processes, no
database setup, no accounts.

### Playing online multiplayer locally

Open the URL above in two different browser tabs/windows (or two devices on
the same network, using your machine's LAN IP instead of `localhost`):

1. In tab A: **Play Online → pick a duration → Create Room** → note the 5-character room code.
2. In tab B: **Play Online → pick the same duration → Join Room** → enter the code.
3. Both players click **Ready Up** in the waiting room. The match starts automatically
   once both are ready, with a 3-2-1-FIGHT countdown.

### Practice Mode

From the Main Menu choose **Practice**, pick a match length, then an AI
difficulty (Easy/Medium/Hard/Expert). This runs entirely offline in the
browser — no server round-trip is needed for combat resolution, though the
same server is still what's serving the page.

---

## How the anti-cheat / validation works

- The client never sends damage or HP directly — only *what it typed* and
  *for which word ID*.
- The server is the single source of truth for: the current word, when it was
  issued, elapsed time, win/loss of each exchange, damage calculation, HP,
  combo count, and the match timer.
- Stale or out-of-order submissions (wrong `wordId`, or arriving after the
  exchange was already resolved) are silently ignored.
- Accuracy is computed server-side from the submitted string compared against
  the authoritative word, not trusted blindly from the client.

## Notes on the "no external assets" approach

Per the project's originality requirements, this build avoids using any
copied or borrowed art/audio:

- Characters and the arena are drawn with Phaser's `Graphics` API at runtime.
- All sound effects and music are synthesized with the Web Audio API
  (oscillators/noise bursts) — nothing is streamed or loaded from disk.

This keeps the whole game copyright-clean, dependency-light, and fast to load.
If you'd like to swap in real sprite sheets, spine animations, or produced
audio later, the `Fighter`, `Arena`, and `SoundManager` classes are the
integration points to replace.

## Known limitations / good next steps

- No reconnect-after-disconnect handling (a disconnect currently ends the match).
- No spectator mode or matchmaking queue (room codes only).
- No persistent leaderboards (intentional — no database per requirements).
- Word list currently ~250 entries across 4 difficulty tiers + 8 special
  words; easy to expand in `server/game/words.js` (and mirror in
  `client/js/systems/WordList.js` for Practice Mode).
