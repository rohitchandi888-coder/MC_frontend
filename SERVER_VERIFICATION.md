# 🔍 Server Verification Checklist

## After Rebuild - Verify on Server

You rebuilt on the server (`[root@srv743135 MC_frontend]# npm run build`), but it's still not working. Let's verify:

### Step 1: Check Files in dist Folder

SSH into your server and check:

```bash
cd /path/to/MC_frontend

# Check dist folder exists
ls -la dist/

# Check critical files exist
ls -la dist/index.html
ls -la dist/fix-url.js
ls -la dist/config.js

# Check index.html contains fix-url.js
grep "fix-url.js" dist/index.html
```

**Expected:**
- ✅ `dist/index.html` exists
- ✅ `dist/fix-url.js` exists (copied from public/)
- ✅ `dist/config.js` exists (copied from public/)
- ✅ `dist/index.html` contains `<script src="/fix-url.js"></script>`

### Step 2: Check Web Server Configuration

**The problem might be:** Your web server is NOT serving from the `dist` folder!

Check where your web server is configured to serve files from:

```bash
# If using Nginx
cat /etc/nginx/sites-available/merchantcoinwallet.com
# or
cat /etc/nginx/nginx.conf

# If using Apache
cat /etc/apache2/sites-available/merchantcoinwallet.com.conf

# If using Node.js/Express
# Check your server.js or app.js file
```

**Look for:**
- `root` directive (Nginx) or `DocumentRoot` (Apache)
- Should point to `/path/to/MC_frontend/dist` or similar
- NOT to `/path/to/MC_frontend` (parent folder)

### Step 3: Common Issues

#### Issue 1: Web Server Serving Wrong Directory

**Symptom:** Build works, but web server serves old files

**Fix:**
```bash
# Update web server config to point to dist folder
# Example for Nginx:
# root /var/www/MC_frontend/dist;

# Then restart web server
sudo systemctl restart nginx
# or
sudo systemctl restart apache2
```

#### Issue 2: Files Not Copied to dist

**Symptom:** `fix-url.js` missing from dist

**Fix:**
```bash
# Vite should auto-copy public/ to dist/
# But if missing, manually copy:
cp public/fix-url.js dist/
cp public/config.js dist/
```

#### Issue 3: Browser/CDN Cache

**Symptom:** New files deployed but browser shows old version

**Fix:**
- Clear browser cache completely
- If using Cloudflare/CDN, purge cache there
- Add cache-busting query string: `?v=2` to script tags

#### Issue 4: Web Server Needs Restart

**Symptom:** Files updated but changes not reflected

**Fix:**
```bash
# Restart web server
sudo systemctl restart nginx
# or
sudo systemctl restart apache2
# or if using PM2
pm2 restart your-app-name
```

### Step 4: Quick Test

On your server, test if files are accessible:

```bash
# Test if fix-url.js is accessible
curl http://localhost/fix-url.js
# or
curl https://merchantcoinwallet.com/fix-url.js

# Should return JavaScript code, not 404
```

### Step 5: Verify Production URL

Visit in browser:
- `https://merchantcoinwallet.com/fix-url.js` - Should show JavaScript code
- `https://merchantcoinwallet.com/config.js` - Should show config
- View page source of `https://merchantcoinwallet.com/` - Should have `<script src="/fix-url.js"></script>`

## Most Likely Issue

**Your web server is probably serving from the wrong directory!**

The `dist` folder has the correct files, but your web server (Nginx/Apache) is configured to serve from:
- `/path/to/MC_frontend/` (wrong - old files)
- Instead of `/path/to/MC_frontend/dist/` (correct - new files)

**Solution:** Update web server configuration to point to the `dist` folder.
