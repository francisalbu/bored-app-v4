# 🔄 Supabase Database Migration Guide

## Overview
This guide will help you migrate from SQLite to Supabase PostgreSQL for production use.

## Why Migrate to Supabase?

✅ **Benefits:**
- PostgreSQL is production-ready and scalable
- Data persists across deployments (unlike SQLite on Render)
- Built-in authentication integration
- Real-time capabilities
- Better performance for concurrent users
- Row Level Security (RLS) for data protection
- Free tier includes 500MB database

## Migration Steps

### 1. Create Tables in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `hnivuisqktlrusyqywaz`
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire content from `backend/migrations/supabase-schema.sql`
6. Paste it into the SQL Editor
7. Click **Run** (or press Cmd/Ctrl + Enter)

This will create:
- All 7 tables (users, operators, experiences, availability_slots, favorites, bookings, reviews)
- All indexes for performance
- Row Level Security policies
- Triggers for auto-updating timestamps

### 2. Configure Environment Variables

Add these to your `backend/.env` file:

```bash
# Database Mode
DB_MODE=supabase  # Change from 'sqlite' to 'supabase'

# Supabase Configuration (already have these)
SUPABASE_URL=https://hnivuisqktlrusyqywaz.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# SQLite path (keep for reference, won't be used in supabase mode)
DB_PATH=/Users/francisalbu/Documents/Bored New Backend/bored_tourist.db
```

**Get your Supabase keys:**
1. Go to Supabase Dashboard > Project Settings > API
2. Copy `anon` `public` key → `SUPABASE_ANON_KEY`
3. Copy `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep secret!)

### 3. Run Data Migration

```bash
cd backend
node migrate-to-supabase.js
```

This will migrate all your data:
- ✅ 6 users
- ✅ 3 operators
- ✅ 3 experiences
- ✅ 398 availability slots
- ✅ 0 favorites
- ✅ 2 bookings
- ✅ 22 reviews

### 4. Update Sequences (Important!)

After migration, you need to update PostgreSQL sequences so new records get the correct IDs.

In Supabase Dashboard > SQL Editor, run:

```sql
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('operators_id_seq', (SELECT MAX(id) FROM operators));
SELECT setval('experiences_id_seq', (SELECT MAX(id) FROM experiences));
SELECT setval('availability_slots_id_seq', (SELECT MAX(id) FROM availability_slots));
SELECT setval('favorites_id_seq', (SELECT MAX(id) FROM favorites));
SELECT setval('bookings_id_seq', (SELECT MAX(id) FROM bookings));
SELECT setval('reviews_id_seq', (SELECT MAX(id) FROM reviews));
```

### 5. Update Backend Code

The backend needs to be updated to use Supabase instead of SQLite. Here are the main changes:

#### Option A: Dual Mode (Recommended for gradual migration)

Update `backend/config/database.js`:

```javascript
const dbMode = process.env.DB_MODE || 'sqlite'; // 'sqlite' or 'supabase'

if (dbMode === 'supabase') {
  const { db } = require('./supabase-db');
  module.exports = { db, mode: 'supabase' };
} else {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = process.env.DB_PATH || './bored_tourist.db';
  const db = new sqlite3.Database(dbPath);
  module.exports = { db, mode: 'sqlite' };
}
```

#### Option B: Full Supabase (Recommended after testing)

Replace all SQLite queries in your routes with Supabase queries using the helper functions in `backend/config/supabase-db.js`.

**Example - Old SQLite:**
```javascript
db.all('SELECT * FROM experiences WHERE is_active = 1', (err, rows) => {
  if (err) return res.status(500).json({ error: err.message });
  res.json(rows);
});
```

**New Supabase:**
```javascript
const { data, error } = await db.experiences.findAll({ is_active: true });
if (error) return res.status(500).json({ error: error.message });
res.json(data);
```

### 6. Test the Migration

1. **Start backend with Supabase:**
   ```bash
   cd backend
   DB_MODE=supabase npm start
   ```

2. **Test API endpoints:**
   ```bash
   # Get experiences
   curl http://localhost:3000/api/experiences
   
   # Get reviews for experience 1
   curl http://localhost:3000/api/reviews/1
   
   # Test authentication
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   ```

3. **Test in the app:**
   - Open the app
   - Check if experiences load
   - Check if reviews appear
   - Try logging in
   - Try creating a booking

### 7. Update Render Deployment

Once everything works locally:

1. **Update Render environment variables:**
   - Go to Render Dashboard > your service
   - Environment tab
   - Add/update:
     ```
     DB_MODE=supabase
     SUPABASE_URL=https://hnivuisqktlrusyqywaz.supabase.co
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     ```

2. **Deploy:**
   ```bash
   git add .
   git commit -m "feat: migrate to Supabase PostgreSQL"
   git push origin main
   ```

Render will auto-deploy and use Supabase! 🚀

## Verification Checklist

After migration, verify:

- [ ] All tables created in Supabase
- [ ] All data migrated (check counts in Supabase Table Editor)
- [ ] Sequences updated (try inserting a test record)
- [ ] Backend starts without errors
- [ ] API endpoints return data
- [ ] Authentication works
- [ ] App can create bookings
- [ ] Reviews display correctly
- [ ] Favorites work

## Rollback Plan

If something goes wrong:

1. **Keep SQLite backup:**
   ```bash
   cp "/Users/francisalbu/Documents/Bored New Backend/bored_tourist.db" \
      "/Users/francisalbu/Documents/Bored New Backend/bored_tourist.db.backup"
   ```

2. **Revert environment variable:**
   ```bash
   DB_MODE=sqlite  # Back to SQLite
   ```

3. **Restart backend:**
   ```bash
   npm start
   ```

## Benefits After Migration

✨ **Immediate benefits:**
- No data loss on Render redeploys
- Faster queries for multiple users
- Real-time data sync capabilities
- Better security with RLS
- Easy database backups
- Visual database editor in Supabase

🚀 **Future capabilities:**
- Real-time bookings updates
- Collaborative features
- Database triggers for notifications
- Advanced analytics queries
- Easy scaling

## Troubleshooting

### Migration script fails
- Check Supabase credentials in `.env`
- Verify SQLite database path is correct
- Check network connection

### Data doesn't appear in Supabase
- Verify tables were created (check Table Editor)
- Check for error messages in migration log
- Try migrating one table at a time

### Backend can't connect to Supabase
- Verify `SUPABASE_SERVICE_ROLE_KEY` is the service role key, not anon key
- Check if firewall is blocking connection
- Verify Supabase project is active

### IDs conflict on new inserts
- Make sure you ran the sequence update SQL
- Check current sequence values: `SELECT last_value FROM users_id_seq;`

## Next Steps

After successful migration:

1. **Remove SQLite dependency** (optional):
   ```bash
   npm uninstall sqlite3
   ```

2. **Update documentation** to reflect Supabase usage

3. **Set up database backups** in Supabase (Settings > Database > Backups)

4. **Monitor database usage** (Supabase Dashboard > Reports)

## Support

- Supabase Docs: https://supabase.com/docs
- SQLite to PostgreSQL: https://supabase.com/docs/guides/database/migrating-and-upgrading-projects

---

Good luck with the migration! 🎉
