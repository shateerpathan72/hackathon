# Simple P2P Fix for Demo

## Problem
- PC posts rumor → Phone doesn't see it
- Peers can't discover each other across devices

## Root Cause
- localStorage is per-device (can't share peer IDs)
- Need a way for devices to find each other

## Simplest Solution: Add "Connect to Peer" UI

### What to Add

**1. Show Your Peer ID**
```html
<div class="peer-info">
  My Peer ID: <code id="myPeerId">rumorality-abc123</code>
  <button onclick="copyPeerId()">Copy</button>
</div>
```

**2. Add Connect Button**
```html
<div class="connect-peer">
  <input type="text" id="peerIdInput" placeholder="Enter peer ID to connect">
  <button onclick="connectManually()">Connect</button>
</div>
```

**3. Add JavaScript**
```javascript
function copyPeerId() {
    navigator.clipboard.writeText(p2pManager.myPeerId);
    showToast('Peer ID copied!', 'success');
}

function connectManually() {
    const peerId = document.getElementById('peerIdInput').value.trim();
    if (peerId) {
        p2pManager.connectToPeer(peerId);
        showToast(`Connecting to ${peerId}...`, 'info');
    }
}

// Update UI with peer ID when ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.getElementById('myPeerId').textContent = p2pManager.myPeerId;
    }, 2000);
});
```

### How to Demo

**Step 1: Open on PC**
- See: "My Peer ID: rumorality-abc123"
- Click "Copy"

**Step 2: Open on Phone**
- Paste peer ID in "Connect to Peer" field
- Click "Connect"
- Status changes to "1 peer"

**Step 3: Test Sync**
- PC posts rumor → Appears on phone
- Phone votes → Updates on PC

**Done!** ✅

---

## Alternative: Use a Tiny Peer Registry Server

If you want automatic discovery, deploy this 10-line server:

```javascript
// server.js (deploy to Vercel)
const peers = new Set();

export default function handler(req, res) {
    if (req.method === 'POST') {
        peers.add(req.body.peerId);
        res.json({ success: true });
    } else {
        res.json({ peers: Array.from(peers) });
    }
}
```

Then peers auto-discover by polling this endpoint.

---

## Recommendation

**For the demo:** Use manual connect (Option 1)
- ✅ Works immediately
- ✅ No extra deployment
- ✅ Shows P2P concept clearly
- ✅ 5 minutes to implement

Want me to add the UI for manual peer connection?
