# 🚀 Run Database Migrations - Step by Step Guide

## Quick Start

You need to run these two migration files on your Railway PostgreSQL database:
- `006_fix_events_deduplication.sql` - Removes duplicate events and prevents future duplicates
- `007_timezone_functional_indexes.sql` - Adds performance indexes (10-100x faster queries)

---

## ✅ **RECOMMENDED: Using Railway CLI**

### Step 1: Login to Railway
```bash
railway login
```
This will open a browser window. Login and authorize.

### Step 2: Link to Your Project
```bash
cd "/Volumes/ADATA SD810/04Systems/Clients (SSD)/Silo Storage Dashboard"
railway link
```
Select your project from the list.

### Step 3: Run the Migrations
```bash
railway run node scripts/run-new-migrations.js
```

**Done! ✅** The migrations will run on your Railway database.

---

## 🔧 **Alternative Method 1: Using Public DATABASE_URL**

### Step 1: Get Your Public DATABASE_URL
1. Go to https://railway.app/
2. Select your project
3. Click on **PostgreSQL** service
4. Go to **Variables** tab
5. Look for `DATABASE_PUBLIC_URL` or click **Connect** and copy the **external** connection URL
   - Should look like: `postgresql://postgres:PASSWORD@xxx.railway.app:5432/railway`
   - **NOT** the internal one ending in `.railway.internal`

### Step 2: Run the Migration Script
```bash
cd "/Volumes/ADATA SD810/04Systems/Clients (SSD)/Silo Storage Dashboard"

# Replace YOUR_PUBLIC_DATABASE_URL with the URL from step 1
DATABASE_URL="YOUR_PUBLIC_DATABASE_URL" node scripts/run-new-migrations.js
```

---

## 🖥️ **Alternative Method 2: Railway Web Console**

1. Go to https://railway.app/
2. Select your project
3. Click on **PostgreSQL** service
4. Click on **Data** tab
5. Click **Query** button
6. Copy the contents of `db/migrations/006_fix_events_deduplication.sql` and paste, then click **Run**
7. Copy the contents of `db/migrations/007_timezone_functional_indexes.sql` and paste, then click **Run**

---

## 📋 What the Migrations Do

### Migration 006: Fix Events Deduplication
- Removes existing duplicate events from the database
- Adds a unique index to prevent future duplicates
- **Impact**: Fixes inflated CTA metrics and funnel conversion rates

### Migration 007: Timezone Functional Indexes
- Creates indexes on timezone-converted date columns
- Uses `CONCURRENTLY` to avoid locking tables
- **Impact**: 10-100x faster analytics queries, prevents timeouts

---

## ✅ Verify Migrations Completed

After running the migrations, you should see:
```
✅ Migration 006_fix_events_deduplication.sql completed successfully
✅ Migration 007_timezone_functional_indexes.sql completed successfully

🎉 All migrations completed successfully!
```

Your analytics dashboard should now:
- Show accurate CTA metrics (no duplicates)
- Load much faster (especially date-range queries)
- Handle larger datasets without timeouts

---

## 🆘 Troubleshooting

### "Unauthorized. Please login with `railway login`"
Run `railway login` in your terminal and authenticate.

### "No linked project found"
Run `railway link` and select your project.

### "DATABASE_URL environment variable is not set"
Make sure you're using the correct method (see alternatives above).

### "Connection refused" or "Could not connect"
You're probably using the internal Railway URL (ends in `.railway.internal`). Get the **public/external** URL instead.

---

## 📞 Need Help?

If you encounter any issues, check:
1. Railway is logged in: `railway whoami`
2. Project is linked: `railway status`
3. Database is accessible: `railway run psql $DATABASE_URL -c "SELECT 1"`

