# ⛩ Onchain Warriors

> **Scan any wallet. Get your personal samurai battle card. Fight on-chain.**

A Web3 personality scanner + auto-battler TCG, built on the OKX Onchain OS.
Punch in any wallet address — Ethereum, Solana, Base, Arbitrum — and the agent
analyzes its on-chain behavior, then mints you one of 8 unique samurai warrior
classes with deterministic stats. Draft a 4-card formation, queue into the
arena, watch a 60-second verifiable auto-battle play out.

```
> ONCHAIN WARRIORS
└─ POWERED BY ONCHAIN OS
```

---

## ✨ Features

| | |
|---|---|
| **🏯 The Dojo** | Wallet → warrior class via FNV-1a hash of on-chain stats. 8 classes (Shogun, Degen Ronin, Diamond Samurai, DeFi Daimyo, Bridge Wanderer, Ghost Ninja, Obsidian Priest, Prophecy Miko), 6 elements (Gold, Fire, Ice, Nature, Storm, Void + Shadow / Cosmic), 3 rarities. Generates a shareable Azuki-style TCG card. |
| **⚔️ Arena** | 4v4 auto-battler with 2×2 formation, 6 turns max, deterministic combat. Element-counter system (Fire > Nature > Storm > Ice, Gold ↔ Void, Shadow ↔ Cosmic). Per-class signature skills + verifiable RNG via single battle seed. |
| **📡 Battle Intel** | Live on-chain smart-money leaderboard. Top 10 wallets with PnL, win rate, volume, recent trades. Click any address to challenge it in the arena. Auto-merges real arena champions with smart-money entries (dedup'd). |
| **📖 How to Play** | In-game codex with all 8 warriors, full stat breakdown, skill mechanics, damage formulas, and verifiable-RNG explainer. Sticky TOC, scroll-spy navigation. |
| **🎵 Cyberpunk BGM** | Procedural 120 BPM A-minor synthesizer track generated entirely in Web Audio API. No external audio files. Sword-slash SFX on every combat hit. |
| **🌐 i18n** | EN / 中文 toggle. Defaults to English. |

---

## 🚀 Quick start (local)

```bash
git clone https://github.com/Hanxueqing/onchain-warriors.git
cd onchain-warriors
npm install
npm start
```

Open `http://localhost:3000`.

That's it. No build step, no bundler, single-file frontend.

### Optional: real on-chain data

By default the app runs in **demo mode** — wallet stats and PnL are generated
deterministically from a hash of the input address (same address → same
result, every time). The demo is always reliable without any API dependency.

To switch to **live on-chain data**:

1. Install the OKX Onchain OS CLI to `~/.local/bin/onchainos`
2. Get an OKX API key from <https://www.okx.com/account/my-api>
3. Copy the env template and fill in your credentials:

   ```bash
   cp .env.example .env
   # then edit .env with your real OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE
   ```

4. Restart the server. You'll see one of three messages on boot:

   ```
   ⛩  Onchain Warriors running at http://localhost:3000
      PVP WebSocket: ws://localhost:3000/pvp
      Auth mode:    API Key (configured ✓) — live on-chain data enabled
   ```

   ```
   Auth mode:    ⚠️  PARTIAL — got OKX_API_KEY but need all three. Falling back to demo data.
   ```

   ```
   Auth mode:    Demo fallback (no API Key set — see .env.example)
   ```

The server **never logs the key value itself** — only whether each of the
three required vars is present. `.env` is gitignored, so secrets never leave
your machine.

If any individual CLI call fails at runtime (rate limit / timeout / network
glitch), that specific request gracefully falls back to synthetic data so the
user never sees an error.

---

## 🛠 Tech stack

- **Backend** — Express.js + native `ws` for PVP matchmaking over WebSocket
- **Frontend** — Single-file `public/index.html` (~5000 lines HTML/CSS/JS, no framework)
- **Fonts** — Orbitron (display), Chakra Petch (UI), Share Tech Mono (terminal), Noto Serif JP (kanji)
- **Audio** — Web Audio API (procedural BGM + SFX, zero audio files)
- **RNG** — FNV-1a hash + seeded LCG for verifiable combat
- **Onchain data** — OKX Onchain OS CLI (optional, with deterministic fallback)
- **Card art** — 8 hand-prompted Azuki-style portraits in `public/art/`

---

## ☁️ Deploying

This is a stateful Node app with a long-lived WebSocket connection — it
**cannot** be hosted on GitHub Pages or any pure static-CDN service.

Recommended platforms (free tier, WebSocket-friendly):

| Platform | Pros | Cons |
|---|---|---|
| **Render** | Easiest setup, supports WS, free tier | Sleeps after 15 min idle (cold start ~30s) |
| **Railway** | $5/mo free credit, no sleep | Credit runs out eventually |
| **Fly.io** | Fast, global edge, generous free tier | Requires `flyctl` install + config |
| **OKX internal** | Best for the hackathon submission | Internal access only |

On all three, the deploy is essentially:

```bash
# Render / Railway: connect GitHub repo, set start command to `npm start`
# Fly.io:
flyctl launch
flyctl deploy
```

The server reads `process.env.PORT` if set (otherwise defaults to 3000), so it
works out of the box on any PaaS that injects `PORT`.

---

## 🎴 Card art

The 8 warrior portraits in `public/art/` were generated with the prompts in
[`CARD_PROMPTS.md`](./CARD_PROMPTS.md) (Azuki-meets-Ghibli aesthetic, 4:5
portrait, ~70-80 KB each as JPEG). The full character lore + stats are in
[`WARRIORS.md`](./WARRIORS.md).

---

## 🧪 How the personality scanner works

Given a wallet address, the agent:

1. Calls `onchainos portfolio all-balances --address $ADDR --chains $CHAINS`
2. Hashes the address with FNV-1a → 32-bit seed
3. Scores the wallet on 6 dimensions: net worth tier, chain diversity, meme
   exposure, holding stability, transaction velocity, DeFi protocol breadth
4. Maps the score vector to one of 8 warrior classes
5. Generates stats (ATK / DEF / LUCK / SPD) deterministically from the seed
6. Looks up the matching kabuto + kanji name + element + rarity

The mapping is **deterministic and reproducible** — every wallet always
returns the same warrior, and anyone can verify the result by re-running the
seed against the score table in `server.js`.

---

## 🤖 Combat verifiability

Every battle is driven by a single seed (default: `hash(playerAddr + oppAddr +
timestamp)`). The seed alone determines every crit roll, every dodge, every
target pick, every damage variance. Two players with the same seed see
**bitwise-identical** battles. No hidden randomness, no server-side coin
flips.

The seed is shown in the victory screen and can be replayed via the URL
query string `?seed=<hex>`.

---

## 📁 Repo layout

```
onchain-warrior/
├── server.js              # Express + WS server, onchainos CLI integration, leaderboard
├── public/
│   ├── index.html         # The entire frontend (HTML + CSS + JS, single file)
│   └── art/               # 8 warrior portrait JPEGs
├── package.json
├── CARD_PROMPTS.md        # Image-gen prompts for each warrior (en)
├── 卡牌生图prompts.md       # Same prompts (中文)
├── WARRIORS.md            # Design doc: stats, skills, lore, balance
├── 提交材料.md             # Hackathon submission materials (中文)
└── README.md
```

---

## 📜 License

MIT — see [LICENSE](./LICENSE).

Built on the OKX Onchain OS. Art prompts use Azuki / Ghibli / Genshin Impact
visual references for stylistic inspiration only.
