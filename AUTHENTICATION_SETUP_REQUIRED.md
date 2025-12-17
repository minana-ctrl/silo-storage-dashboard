# ⚡ Complete Setup Guide - Authentication Login Fix

## Issue Summary
The login system is implemented but not fully configured yet. The database connection needs to be set up.

---

## What You Need to Do

### Step 1: Get Your Database URL

You need a PostgreSQL database. Do you have one of these?

**Option A: Using Railway (Already Set Up)**
- Go to: https://railway.app/dashboard
- Find your PostgreSQL plugin
- Click "Connect"
- Copy the connection string
- Should look like: `postgresql://user:password@host:port/database`

**Option B: Local PostgreSQL**
```bash
# If using local PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/silo_dashboard"
```

**Option C: Free Hosting (Neon.tech)**
1. Go to https://neon.tech
2. Sign up (free)
3. Create a project
4. Copy the connection string

---

### Step 2: Create .env.local File

In your project root, create a file named `.env.local` with:

```
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z
```

**Important Notes:**
- Replace the DATABASE_URL with your actual connection string
- The JWT_SECRET above is example - you can use it or generate new:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

---

### Step 3: Setup Database

Once .env.local is created with DATABASE_URL, run:

```bash
# Run migrations (creates tables)
npm run migrate

# Seed admin user
node scripts/seed-admin.js
```

You should see:
```
✓ Admin user created successfully!

Login credentials:
  Email:    admin@silostorage.com
  Password: Admin123!

⚠️  Important: Change this password after first login!
```

---

### Step 4: Clear Cache & Start Server

```bash
# Clear Next.js cache
rm -rf .next

# Start development server
npm run dev
```

You should see:
```
✓ Ready in 6s
✓ Compiled /middleware in 67ms
✓ Compiled (XX modules)
```

---

### Step 5: Test Login

1. Open http://localhost:3000 in your browser
2. Should redirect to http://localhost:3000/login
3. Enter credentials:
   - Email: `admin@silostorage.com`
   - Password: `Admin123!`
4. Should redirect to `/analytics` with user profile showing

---

## Database Connection Examples

### Railway PostgreSQL
```
postgresql://postgres:XXXX@containers-us-west-XXX.railway.app:5432/railway
```

### Local PostgreSQL
```
postgresql://postgres:yourpassword@localhost:5432/silo_dashboard
```

### Neon.tech
```
postgresql://neondb_owner:XXXX@ep-XXX.us-east-1.neon.tech/neondb?sslmode=require
```

---

## What Gets Created

After running migrations and seed:

**Database Tables:**
- `users` table with columns: id, email, password_hash, name, role, created_at, last_login, is_active

**Admin User:**
- Email: `admin@silostorage.com`
- Password: `Admin123!` (change after first login)
- Role: admin

---

## Verification

### Check 1: Verify Database Connection
```bash
npm run migrate
# Should say: "Migrations completed successfully" or "Migration files processed"
```

### Check 2: Verify Admin User Created
```bash
node scripts/seed-admin.js
# Should say: "✓ Admin user created successfully!"
```

### Check 3: Verify Dev Server Starts
```bash
npm run dev
# Should show: ✓ Ready in Xs
# Should show: No error messages
```

### Check 4: Test Login Page
1. Open http://localhost:3000
2. Should see login form
3. Try login with admin credentials
4. Should see dashboard with user profile

---

## Troubleshooting

### "Cannot find module 'bcrypt'"
```bash
npm install
```

### "DATABASE_URL not set"
- Create `.env.local` file with DATABASE_URL
- Restart dev server

### "Users table doesn't exist"
```bash
npm run migrate
```

### "Admin user doesn't exist"
```bash
node scripts/seed-admin.js
```

### Login page shows but won't submit
- Check browser console (F12) for errors
- Check Network tab (F12) for failed requests
- Verify DATABASE_URL is correct

---

## Complete Fresh Start Command

Run this if stuck:

```bash
# 1. Stop server (Ctrl+C)
# 2. Run these commands:

rm -rf .next node_modules
npm install
npm run migrate
node scripts/seed-admin.js
npm run dev
```

Then test at http://localhost:3000/login

---

## Next Steps

1. **Get your DATABASE_URL** (Railway, Local, or Neon)
2. **Create .env.local** with DATABASE_URL and JWT_SECRET
3. **Run migrations**: `npm run migrate`
4. **Seed admin**: `node scripts/seed-admin.js`
5. **Start server**: `npm run dev`
6. **Test login**: http://localhost:3000

**Once you provide your DATABASE_URL, I can automate all these steps for you!**

---

**Status**: Waiting for DATABASE_URL configuration  
**Estimated Time**: 5 minutes to complete setup


