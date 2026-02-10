# 🔧 Testing Preferences Route Fix

## 🎯 Problem
API returns 404 "Endpoint not found" when trying to save quiz preferences.

## ✅ Fix Applied
Changed `backend/routes/preferences.js` to use `authenticateSupabase` instead of non-existent `authenticateToken`.

## 🧪 Test Locally First

### 1. Start Backend Server Locally
```bash
cd backend
npm install
npm start
```

Should see:
```
✅ Supabase connection successful
🚀 Server running on port 3000
```

### 2. Test the Endpoint
```bash
# Test health check
curl http://localhost:3000/health

# Test preferences endpoint (will fail without auth, but should not say "Endpoint not found")
curl -X POST http://localhost:3000/api/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fake-token" \
  -d '{"favorite_categories":["test"],"preferences":{"test":true}}'

# Should get 401 Unauthorized, NOT 404 Endpoint not found
```

### 3. Fix and Deploy

If local test works:

```bash
# Make sure file is committed
git add backend/routes/preferences.js backend/server.js
git commit -m "Fix: Add preferences route with correct auth middleware"
git push origin main
```

### 4. Force Render Redeploy

Option A: Manual Deploy
1. Go to https://dashboard.render.com/
2. Click `bored-tourist-api`
3. Click "Manual Deploy" → "Deploy latest commit"

Option B: Trigger with empty commit
```bash
git commit --allow-empty -m "Trigger Render redeploy for preferences route"
git push origin main
```

### 5. Verify Render Logs

Check logs at: https://dashboard.render.com/
Look for:
- `✅ Supabase connection successful`
- `🚀 Server running on port 3000`
- NO errors about "Cannot find module"

### 6. Test Production
```bash
# Should return server info
curl https://bored-tourist-api.onrender.com/health

# Should return 401 (auth required), NOT 404
curl -X POST https://bored-tourist-api.onrender.com/api/preferences \
  -H "Content-Type: application/json" \
  -d '{"favorite_categories":["test"],"preferences":{"test":true}}'
```

## 🐛 If Still Fails

### Check if file exists on Render
The file might not have been deployed. Verify:
1. Check GitHub repo has `backend/routes/preferences.js`
2. Check Render build logs show successful deployment
3. Check Render environment variables are set

### Possible Issues

1. **File not in git**
   ```bash
   git ls-files backend/routes/preferences.js
   # Should show: backend/routes/preferences.js
   ```

2. **Syntax error in file**
   ```bash
   node -c backend/routes/preferences.js
   # Should show: no output (success)
   ```

3. **Missing dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Environment variables missing on Render**
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - JWT_SECRET

## 📝 Current Status

- ✅ Code fixed locally
- ✅ Committed to GitHub (commit 987f677)
- ⏳ Waiting for Render to deploy
- ❌ Still getting 404 on production

**Next Action:** Start backend locally to verify it works, then force Render redeploy.
