# Vercel Deployment Guide

## Quick Deploy Steps

### 1. Login to Vercel
```bash
vercel login
```
- Opens browser
- Login with GitHub/GitLab/Email

### 2. Deploy
```bash
cd e:\Data\hackathon
vercel --prod
```

### 3. Answer Prompts
- "Set up and deploy?" → **Y**
- "Which scope?" → Select your account
- "Link to existing project?" → **N**
- "Project name?" → **rumorality**
- "Directory?" → **./** (press Enter)
- "Override settings?" → **N**

### 4. Get URL
You'll receive: `https://rumorality-xxxxx.vercel.app`

### 5. Test on All Devices
- **PC:** Open the Vercel URL
- **Phone:** Open the Vercel URL
- **Laptop:** Open the Vercel URL

All will work with HTTPS! ✅

---

## After Deployment

Test P2P sync:
1. Open on phone → New user created
2. Open on PC → Different user
3. Post rumor on phone → Appears on PC
4. Vote from PC → Updates on phone

**This proves the mesh network works!**
