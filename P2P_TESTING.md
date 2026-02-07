# P2P Cross-Device Testing Guide

## 🎯 Goal
Test Rumorality across **phone, PC, and laptop** as different users with real-time P2P synchronization.

---

## Quick Setup

### Step 1: Deploy the App

**Option A: Deploy to Vercel (Recommended)**
```bash
cd e:\Data\hackathon
vercel
```

**Option B: Use Local Network**
```bash
# Start local server
python -m http.server 8000

# Find your local IP
ipconfig
# Look for "IPv4 Address" (e.g., 192.168.1.100)
```

### Step 2: Open on Multiple Devices

**On PC:**
- Open: `https://your-app.vercel.app` (or `http://192.168.1.100:8000`)
- You'll see: User ID like `@a1b2c3d4`
- P2P Status: "Online" with green dot

**On Laptop:**
- Open same URL
- Different User ID: `@e5f6g7h8`
- Should auto-connect to PC

**On Phone:**
- Open same URL
- Different User ID: `@i9j0k1l2`
- Should auto-connect to both PC and laptop

---

## ✅ Test Scenario 1: Rumor Broadcasting

**On Phone:**
1. Post rumor: "Free pizza in cafeteria!"
2. Watch it appear locally

**On PC (within 2-3 seconds):**
1. ✅ Rumor appears automatically
2. ✅ Same rumor ID
3. ✅ Shows phone's user ID as author

**On Laptop:**
1. ✅ Rumor also appears
2. ✅ All devices show identical data

**What to check:**
- [ ] Rumor appears on all devices
- [ ] Author ID matches phone user
- [ ] Timestamp is the same
- [ ] Trust score shows 50% (neutral)

---

## ✅ Test Scenario 2: Vote Synchronization

**On PC:**
1. Click "Vote" on the pizza rumor
2. Select "TRUE"
3. Enter 5 votes (costs 25⭐)
4. Confirm vote

**On Phone (within 2-3 seconds):**
1. ✅ Vote count updates: "✅ 5 votes (25⭐)"
2. ✅ Trust score changes to 100%
3. ✅ PC's balance decreased by 25⭐

**On Laptop:**
1. Vote "FALSE" with 3 votes (costs 9⭐)
2. Watch all devices update

**What to check:**
- [ ] Vote counts update on all devices
- [ ] Trust scores recalculate correctly
- [ ] Each device shows accurate peer count
- [ ] No double-voting allowed

---

## ✅ Test Scenario 3: Consensus Sealing

**Setup:**
- Phone posts rumor
- PC votes TRUE with 10 votes (100⭐)
- Laptop votes TRUE with 5 votes (25⭐)
- Total: 125⭐ TRUE vs 0⭐ FALSE = 100% majority

**After 66% threshold:**
1. ✅ Rumor seals on all devices
2. ✅ "✅ VERIFIED" badge appears
3. ✅ Winners get rewards
4. ✅ Balances sync across devices

---

## 🔍 Troubleshooting

### "0 peers" - Not Connecting

**Check:**
1. All devices on same WiFi? (for local network)
2. Firewall blocking WebRTC?
3. Check browser console for errors

**Fix:**
- Use deployed version (Vercel) instead of local
- Try different browser (Chrome works best)
- Refresh all devices

### "Rumor not syncing"

**Check:**
1. P2P status shows "Online"?
2. Peer count > 0?
3. Check console for "P2P: Broadcasted to..."

**Fix:**
- Wait 10 seconds (auto-discovery runs every 10s)
- Manually refresh feed
- Check signature validation errors in console

### "Invalid signature" errors

**Cause:** Clock skew between devices

**Fix:**
- Sync device clocks
- Ignore if timestamp < 1 hour difference

---

## 📊 What You Should See

### P2P Status Indicator (Top Left)

**Green dot + "Online":**
- ✅ Connected to PeerJS signaling server
- ✅ Ready to discover peers

**Peer count:**
- `1 peer` = Connected to 1 other device
- `2 peers` = Connected to 2 devices
- Updates automatically as devices join/leave

### Console Logs

```
P2P: Connected with ID: rumorality-a1b2c3d4
P2P: Connecting to rumorality-e5f6g7h8
P2P: Connection established with rumorality-e5f6g7h8
P2P: Broadcasted to rumorality-e5f6g7h8
P2P: Received data from rumorality-e5f6g7h8
P2P: Added rumor from peer abc123
```

---

## 🎬 Demo Script (For Presentation)

**Minute 1: Setup**
- Show 3 devices side-by-side
- Point out different user IDs
- Show P2P status: "Online, 2 peers"

**Minute 2: Post Rumor**
- Post on phone: "Classes cancelled tomorrow"
- Watch it appear on PC and laptop
- Highlight instant sync

**Minute 3: Voting**
- PC votes TRUE (10 votes)
- Laptop votes FALSE (5 votes)
- Show trust score: 80% TRUE
- Highlight quadratic cost (100⭐ vs 25⭐)

**Minute 4: Consensus**
- Phone votes TRUE (5 votes)
- Total: 125⭐ TRUE vs 25⭐ FALSE
- Rumor seals (83% > 66%)
- Show rewards distributed

**Minute 5: Game Theory**
- Explain why FALSE voters lost money
- Show slashing in action
- Prove lying is unprofitable

---

## 🚀 Advanced Testing

### Test Network Partition

1. Disconnect phone from WiFi
2. Post rumor on phone (offline)
3. Post different rumor on PC (online)
4. Reconnect phone
5. ✅ Both rumors sync
6. ✅ No data loss

### Test Signature Validation

1. Open browser console
2. Try to manually inject fake rumor:
```javascript
p2pManager.handleIncomingData({
    type: 'new_rumor',
    rumor: { id: 'fake', content: 'Hacked!' }
});
```
3. ✅ Should reject (invalid signature)

---

## 📝 Checklist for Hackathon Demo

- [ ] Deploy to Vercel/Netlify
- [ ] Test on 3 devices (phone, PC, laptop)
- [ ] Verify P2P connection (green dot, peer count)
- [ ] Post rumor from one device, see on others
- [ ] Vote from multiple devices, watch sync
- [ ] Trigger consensus sealing
- [ ] Show game theory (slashing/rewards)
- [ ] Record demo video (5 min max)

---

**Ready to test!** Open the app on your phone, PC, and laptop and watch the magic happen! 🚀
