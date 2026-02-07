# 🚨 Mobile Testing Issue - HTTPS Required

## Problem
You're seeing: **"Error: Cannot read properties of undefined (reading 'digest')"**

**Cause:** Web Crypto API (used for cryptographic signatures) requires **HTTPS** on mobile browsers. Your local server (`http://192.168.100.225:8000`) uses HTTP, which mobile browsers block for security.

---

## ✅ Solution: Deploy to Vercel (HTTPS)

This will give you a proper HTTPS URL that works on all devices.

### Quick Deploy (2 minutes)

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Deploy
cd e:\Data\hackathon
vercel
```

**Follow prompts:**
1. "Set up and deploy?" → **Y**
2. "Which scope?" → Select your account
3. "Link to existing project?" → **N**
4. "Project name?" → **rumorality** (or press Enter)
5. "Directory?" → **./** (press Enter)
6. "Override settings?" → **N**

**You'll get:** `https://rumorality-xxxxx.vercel.app`

---

## 🧪 Then Test

**On PC:** `https://rumorality-xxxxx.vercel.app`
**On Phone:** `https://rumorality-xxxxx.vercel.app`
**On Laptop:** `https://rumorality-xxxxx.vercel.app`

All devices will work with full crypto support!

---

## Alternative: Test on PC Only (For Now)

If you want to test locally first without deploying:

**Use 3 different browsers on PC:**
1. Chrome (normal window)
2. Chrome (incognito)
3. Firefox

Each will be a different user (different fingerprint).

**On PC, open:**
- Chrome: `http://localhost:8000`
- Firefox: `http://localhost:8000`
- Edge: `http://localhost:8000`

This works because `localhost` is treated as secure context.

---

## Why This Happens

| Connection | Web Crypto API | Works? |
|------------|----------------|--------|
| `https://...` | ✅ Available | ✅ Yes |
| `http://localhost:8000` | ✅ Available | ✅ Yes (PC only) |
| `http://192.168.x.x:8000` | ❌ Blocked on mobile | ❌ No |

**Mobile browsers block crypto on non-HTTPS for security.**

---

## 🚀 Recommended Next Step

**Deploy to Vercel now** so you can test from phone, PC, and laptop with full P2P sync!

Want me to help you deploy?
