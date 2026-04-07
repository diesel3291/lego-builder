# Deploy to Render (No Router Access)

This deploy path gives you a public HTTPS link that anyone can open in a browser.

## 1) Push this repo to GitHub
If not already pushed:

```bash
git add .
git commit -m "chore: add docker deploy config"
git push
```

## 2) Create a Render Web Service
1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Click **New +** -> **Web Service**
3. Connect your GitHub repo `diesel3291/lego-builder`
4. Render should detect `Dockerfile` automatically
5. Set:
   - **Name**: `lego-builder` (or any name)
   - **Region**: nearest to you
   - **Plan**: Free/Starter
6. Click **Create Web Service**

## 3) Open your public URL
When build finishes, Render gives:
- `https://<service-name>.onrender.com`

Share that URL directly. No setup needed on other devices.

## Optional: basic protection
If you only want family access, add authentication in the app before sharing broadly.
