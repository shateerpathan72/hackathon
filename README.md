# Rumorality - Quick Start

## What is Rumorality?

A decentralized campus news platform where **truth is more profitable than lies**. Students post anonymous rumors, stake reputation tokens, and vote using quadratic voting. Game theory ensures honest behavior.

## How to Run

1. Open `index.html` in your browser
2. That's it! No installation needed.

## Key Features

✅ **Anonymous posting** (cryptographic identity)  
✅ **Reputation staking** (10⭐ to post)  
✅ **Quadratic voting** (Cost = Votes²)  
✅ **Auto-consensus** (48h or 66% majority)  
✅ **Slashing & rewards** (winners profit, losers burn)  
✅ **Tombstone deletion** (preserves graph integrity)  
✅ **Sybil resistance** (device binding + cooldowns)

## Quick Test

1. Post a rumor (costs 10⭐)
2. Open in **incognito window** (new user)
3. Vote on the rumor
4. Watch trust scores update!

## Testing Mode

Click the ⚙️ icon to:
- Add test tokens
- Toggle restrictions
- Reset app data

## Files

- `index.html` - Main app
- `styles.css` - Premium UI design
- `js/` - All logic modules
- `TESTING.md` - Detailed testing guide
- `rumorality.md` - Original hackathon doc

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS
- **Storage:** IndexedDB (local-first)
- **Crypto:** Web Crypto API (Ed25519)
- **Identity:** Browser fingerprinting

## Deployment

Deploy to Vercel/Netlify:
```bash
# Just upload the entire folder
# No build step needed!
```

## Documentation

See `TESTING.md` for:
- Multi-user testing scenarios
- Game theory verification
- Troubleshooting
- Demo preparation

---

**Hackathon Submission:** This is a web-based prototype demonstrating the cryptoeconomic mechanisms. Mobile P2P version is the production roadmap.
