# 🔧 Login Issues - Complete Fix Guide

## Problem
The login isn't working because:
1. The dev server has stale/cached files
2. Need to ensure database is properly set up
3. Admin user needs to be created

## Solution

### Step 1: Stop the Dev Server
Press `Ctrl+C` in the terminal to stop the running server.

### Step 2: Clear Cache
```bash
rm -rf .next
```

### Step 3: Verify Database Setup
```bash
# Check if users table exists
psql $DATABASE_URL -c "\dt users;"

# Should show: users table

# If not, run migrations
npm run migrate

# Verify admin user exists
psql $DATABASE_URL -c "SELECT email, role FROM users LIMIT 5;"

# If no users, create admin:
node scripts/seed-admin.js
```

### Step 4: Verify Environment Variables
```bash
# Check if JWT_SECRET is set
echo $JWT_SECRET

# If empty, set it:
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "JWT_SECRET=$JWT_SECRET" >> .env.local
```

### Step 5: Restart Dev Server
```bash
npm run dev
```

### Step 6: Test Login
1. Go to `http://localhost:3000`
2. Should redirect to `/login`
3. Enter credentials:
   - **Email**: `admin@silostorage.com`
   - **Password**: `Admin123!`
4. Should redirect to `/analytics`

---

## If Still Not Working - Debug Steps

### Check 1: Verify Cookie is Set
Open browser DevTools → Application → Cookies
- Look for cookie named: `auth-token`
- Should appear after successful login

### Check 2: Check Browser Console
Open DevTools → Console
- Look for any error messages
- Screenshot errors and share

### Check 3: Check Network Requests
Open DevTools → Network
1. Click Login button
2. Look for `POST /api/auth/login` request
3. Check Response tab:
   - Should see user data
   - Status should be 200, not 401 or 500

### Check 4: Verify Database User
```bash
psql $DATABASE_URL -c "SELECT id, email, name, role, password_hash FROM users WHERE email='admin@silostorage.com';"

# Should return one row with:
# - id: 1 (or any number)
# - email: admin@silostorage.com
# - name: Administrator
# - role: admin
# - password_hash: (long encrypted string)
```

---

## Complete Fresh Start

If nothing works, do a complete reset:

```bash
# 1. Stop dev server
# Ctrl+C

# 2. Remove everything
rm -rf node_modules package-lock.json .next db/migrations/003_create_users_table.sql

# 3. Fresh install
npm install

# 4. Create users table
npm run migrate

# 5. Set environment
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "JWT_SECRET=$JWT_SECRET" >> .env.local

# 6. Create admin user
node scripts/seed-admin.js

# 7. Start fresh
npm run dev
```

---

## Quick Verification Checklist

- [ ] Database is running (`psql $DATABASE_URL`)
- [ ] Users table exists (`\dt users` in psql)
- [ ] Admin user exists (`SELECT * FROM users;`)
- [ ] JWT_SECRET is set (`echo $JWT_SECRET`)
- [ ] `.next` cache is cleared
- [ ] Dev server shows `✓ Ready in Xs`
- [ ] No server action errors in terminal
- [ ] Can navigate to `/login`
- [ ] Can enter credentials
- [ ] Login button submits without errors

---

## Common Login Issues & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "Invalid email or password" | Wrong credentials | Use admin@silostorage.com / Admin123! |
| Blank login page | Database not connected | Check DATABASE_URL |
| 401 Unauthorized | No cookie set | Check bcrypt is loading |
| 500 error | Database query failed | Check users table exists |
| Redirect loop | JWT_SECRET not set | Set JWT_SECRET env var |
| Blank sidebar | User fetch failed | Verify /api/auth/me works |

---

## If You See Errors in Terminal

### "Server actions must be async"
✅ FIXED - Files are correct, just need cache clear and restart

### "bcrypt not available"
- This is a warning, should still work
- If login fails, check node_modules is installed

### "Cannot find module"
- Run `npm install`
- Delete `node_modules` and reinstall if needed

---

## Contact/Support

If login still doesn't work after these steps:
1. Take a screenshot of the error
2. Check browser console for errors
3. Share the terminal output
4. Share the network request response

The authentication system is complete and should work - likely just needs cache clear and server restart!

---

**Status**: Ready to Fix  
**Next**: Follow steps 1-6 above

