# 🔧 LiteSpeed Web Server SPA Configuration

## The Problem

Your site shows **404 Not Found** for `/login` because LiteSpeed is trying to find a file/folder instead of serving your React app.

**React apps are Single Page Applications (SPA)** - all routes should serve `index.html`.

## Solution: Configure LiteSpeed for SPA Routing

### Option 1: .htaccess File (Recommended)

Create or update `.htaccess` file in your `dist` folder (or web root):

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Don't rewrite files or directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # Rewrite everything else to index.html
  RewriteRule . /index.html [L]
</IfModule>

# Enable CORS if needed
<IfModule mod_headers.c>
  Header set Access-Control-Allow-Origin "*"
</IfModule>
```

### Option 2: LiteSpeed WebAdmin Configuration

1. **Login to LiteSpeed WebAdmin**
2. **Navigate to:** Virtual Hosts → Your Domain → Rewrite
3. **Enable Rewrite:** Set to "Yes"
4. **Add Rewrite Rules:**
   ```
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule . /index.html [L]
   ```

### Option 3: Virtual Host Configuration

Edit your virtual host configuration:

```apache
<VirtualHost *:443>
    ServerName merchantcoinwallet.com
    DocumentRoot /path/to/MC_frontend/dist
    
    <Directory /path/to/MC_frontend/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # SPA Routing
        RewriteEngine On
        RewriteBase /
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>
```

## Quick Fix Steps

### Step 1: Create .htaccess in dist folder

On your server:

```bash
cd /path/to/MC_frontend/dist

# Create .htaccess file
cat > .htaccess << 'EOF'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
EOF

# Set permissions
chmod 644 .htaccess
```

### Step 2: Verify DocumentRoot Points to dist

Check your LiteSpeed configuration:

```bash
# Find your virtual host config
grep -r "merchantcoinwallet.com" /usr/local/lsws/conf/
# or
grep -r "merchantcoinwallet.com" /etc/lsws/

# Verify DocumentRoot points to dist folder
# Should be: /path/to/MC_frontend/dist
# NOT: /path/to/MC_frontend
```

### Step 3: Restart LiteSpeed

```bash
# Restart LiteSpeed
/usr/local/lsws/bin/lswsctrl restart
# or
systemctl restart lsws
```

### Step 4: Test

After configuration:
1. Visit: `https://merchantcoinwallet.com/` - Should load app
2. Visit: `https://merchantcoinwallet.com/login` - Should load app (not 404)
3. Visit: `https://merchantcoinwallet.com/app` - Should load app (not 404)

## Verify Files Are in Correct Location

```bash
# Check dist folder structure
ls -la /path/to/MC_frontend/dist/

# Should see:
# - index.html
# - fix-url.js
# - config.js
# - assets/
# - .htaccess (after creating it)
```

## Common Issues

### Issue 1: .htaccess Not Working

**Symptom:** Still getting 404 even with .htaccess

**Fix:**
- Check `AllowOverride All` in virtual host config
- Verify mod_rewrite is enabled in LiteSpeed
- Check file permissions: `chmod 644 .htaccess`

### Issue 2: DocumentRoot Wrong

**Symptom:** Files not found

**Fix:**
- Update DocumentRoot to point to `dist` folder
- Restart LiteSpeed

### Issue 3: Cache Issues

**Symptom:** Changes not reflected

**Fix:**
- Clear LiteSpeed cache
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)

## Testing Checklist

- [ ] `.htaccess` file created in `dist` folder
- [ ] DocumentRoot points to `dist` folder
- [ ] LiteSpeed restarted
- [ ] `https://merchantcoinwallet.com/` loads correctly
- [ ] `https://merchantcoinwallet.com/login` loads (not 404)
- [ ] `https://merchantcoinwallet.com/app` loads (not 404)
- [ ] Browser console shows "URL FIX SCRIPT LOADED"
