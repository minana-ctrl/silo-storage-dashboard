# Authentication Quick Reference

## 🚀 Quick Start (5 Minutes)

```bash
# 1. Install
npm install

# 2. Migrate database
npm run migrate

# 3. Generate JWT secret
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 4. Set environment variable
echo "JWT_SECRET=$JWT_SECRET" >> .env.local

# 5. Seed admin user
node scripts/seed-admin.js

# 6. Start server
npm run dev

# 7. Go to http://localhost:3000 → redirects to /login
# 8. Log in: admin@silostorage.com / Admin123!
```

## 📝 API Endpoints

### Authentication

**POST /api/auth/login**
```javascript
// Request
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@silostorage.com',
    password: 'Admin123!'
  })
});

// Response: 200 OK
{
  "success": true,
  "user": {
    "id": 1,
    "email": "admin@silostorage.com",
    "name": "Administrator",
    "role": "admin",
    "created_at": "2024-01-15T10:30:00Z",
    "last_login": "2024-01-15T10:30:00Z",
    "is_active": true
  }
}
```

**POST /api/auth/logout**
```javascript
fetch('/api/auth/logout', { method: 'POST' });
// Clears session and returns: { "success": true }
```

**GET /api/auth/me**
```javascript
fetch('/api/auth/me').then(r => r.json());
// Returns: { "user": {...} }
```

### User Management (Admin Only)

**GET /api/users** - List all users
```javascript
fetch('/api/users').then(r => r.json());
// Returns: { "users": [...] }
```

**POST /api/users** - Create user
```javascript
fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john@example.com',
    name: 'John Doe',
    role: 'user' // or 'admin'
  })
});

// Response includes:
{
  "success": true,
  "user": {...},
  "temporaryPassword": "GeneratedPassword123!"
}
```

**DELETE /api/users?id=123** - Deactivate user
```javascript
fetch('/api/users?id=123', { method: 'DELETE' });
// Returns: { "success": true }
```

## 🔑 Key Files

| File | Purpose |
|------|---------|
| `lib/auth.ts` | Core auth functions (hash, verify, token) |
| `middleware.ts` | Route protection |
| `app/login/page.tsx` | Login form UI |
| `app/settings/page.tsx` | Admin user management |
| `components/Sidebar.tsx` | Profile + logout |
| `app/api/auth/*` | Auth endpoints |
| `app/api/users/route.ts` | User management API |

## 🔐 Security

- Passwords: Bcrypt (12 rounds)
- Tokens: JWT, 7-day expiration
- Cookies: HTTP-only, Secure, SameSite
- Validation: Password strength, email format
- Access: Role-based (admin/user)

## 🧪 Common Tasks

### Create a New User
1. Log in as admin
2. Go to `/settings`
3. Click "Add User"
4. Fill in email, name, role
5. Click "Create User"
6. Copy temporary password
7. Share with new user (they can change it after login)

### Change Admin Password
1. Log in as admin@silostorage.com / Admin123!
2. User must manage password change in future version
3. For now, use database direct update or new user creation

### Reset User Password
1. Log in as admin
2. Delete the user
3. Recreate with new email or same email
4. Share new temporary password

### Debug Login Issues
```bash
# Check if users table exists
psql $DATABASE_URL -c "\dt users;"

# Check if admin user exists
psql $DATABASE_URL -c "SELECT email, name, role FROM users;"

# Check JWT_SECRET is set
echo $JWT_SECRET

# Check middleware is active
curl -i http://localhost:3000/
# Should redirect to /login if not authenticated
```

## ⚙️ Configuration

### JWT Token Settings
**File**: `lib/auth.ts` (lines 1-25)
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret...';
const TOKEN_EXPIRATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOKIE_NAME = 'auth-token';
```

### Public Routes
**File**: `middleware.ts` (line 9)
```typescript
const publicRoutes = ['/login', '/api/auth/login'];
```

### Password Requirements
**File**: `lib/auth.ts` (lines 146-165)
- Minimum 8 characters
- Uppercase letter required
- Lowercase letter required
- Number required

### Bcrypt Cost Factor
**File**: `lib/auth.ts` (line 35)
```typescript
return bcrypt.hash(password, 12); // 12 = cost factor
```
Higher = slower (more secure but slower). 12 is recommended.

## 🚨 Important Notes

1. **Change Default Admin Password**: After first login, the admin should change password from `Admin123!`
2. **JWT_SECRET**: Use strong random string in production (minimum 32 chars)
3. **Database**: Ensure PostgreSQL database is running and migrations applied
4. **HTTPS**: In production, always use HTTPS with secure cookies
5. **Env Variables**: Keep JWT_SECRET secret, never commit to version control

## 📖 Full Documentation

See `AUTH_SETUP.md` for comprehensive documentation including:
- Detailed setup instructions
- Architecture explanation
- Deployment guides
- Troubleshooting
- Future enhancements

---

**Last Updated**: December 2024


