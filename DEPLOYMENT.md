# Deployment Guide

## Quick Deploy (No Build Required!)

Rumorality is a static web app - just upload the files and go!

---

## Option 1: Vercel (Recommended)

### Method A: Drag & Drop
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New" → "Project"
4. Drag the `hackathon` folder
5. Click "Deploy"
6. Done! You'll get a URL like `rumorality.vercel.app`

### Method B: CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd e:\Data\hackathon
vercel

# Follow prompts (just press Enter for defaults)
```

---

## Option 2: Netlify

### Method A: Drag & Drop
1. Go to [netlify.com/drop](https://netlify.com/drop)
2. Drag the `hackathon` folder
3. Done! Instant deployment

### Method B: CLI
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
cd e:\Data\hackathon
netlify deploy --prod

# Follow prompts
```

---

## Option 3: GitHub Pages

```bash
# Initialize git (if not already)
cd e:\Data\hackathon
git init

# Add all files
git add .
git commit -m "Initial commit: Rumorality web app"

# Create GitHub repo and push
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/rumorality.git
git push -u origin main

# Enable GitHub Pages
# Go to repo Settings → Pages → Source: main branch → Save
```

Your site will be at: `https://YOUR_USERNAME.github.io/rumorality/`

---

## Option 4: Local Testing

Just open `index.html` in your browser:

**Windows:**
```bash
cd e:\Data\hackathon
start index.html
```

**Or use a local server:**
```bash
# Python 3
python -m http.server 8000

# Node.js (if you have http-server)
npx http-server -p 8000
```

Then visit: `http://localhost:8000`

---

## Post-Deployment Checklist

After deploying:

- [ ] Test the deployed URL
- [ ] Verify all features work (post, vote, seal)
- [ ] Test on mobile devices
- [ ] Share the link with your team
- [ ] Update `rumorality.md` with the live demo link

---

## Troubleshooting

**"Mixed content" errors:**
- Ensure you're using HTTPS (Vercel/Netlify do this automatically)

**IndexedDB not working:**
- Check browser console for errors
- Try incognito mode
- Clear browser data and retry

**Slow loading:**
- All assets are local, should be instant
- Check network tab in DevTools

---

## Custom Domain (Optional)

### Vercel
1. Go to project settings
2. Domains → Add domain
3. Follow DNS setup instructions

### Netlify
1. Site settings → Domain management
2. Add custom domain
3. Update DNS records

---

## Environment Variables

None needed! This is a fully client-side app.

---

## Analytics (Optional)

Add to `index.html` before `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'YOUR_ID');
</script>
```

---

## Demo Video Recording

### Recommended Tools:
- **OBS Studio** (free, powerful)
- **Loom** (easy, cloud-based)
- **Browser built-in** (Chrome: Extensions → Screen recorder)

### Recording Tips:
1. Set resolution to 1920x1080
2. Record at 30fps minimum
3. Use multiple browser windows side-by-side
4. Narrate as you demo
5. Keep it under 5 minutes
6. Show:
   - Posting a rumor
   - Quadratic voting
   - Trust scores
   - Consensus sealing
   - Reward distribution

---

## Hackathon Submission

Include these links:

- **Live Demo:** [Your deployed URL]
- **GitHub Repo:** [Your repo URL]
- **Video Demo:** [YouTube/Loom link]
- **Documentation:** Link to README.md

---

**Ready to deploy?** Choose your platform and follow the steps above!
