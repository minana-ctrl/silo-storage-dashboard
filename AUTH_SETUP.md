# Authentication Setup Guide

This document explains the authentication system implemented in the Silo Storage Dashboard.

## Overview

The authentication system provides:
- Email/password-based login
- Secure session management with HTTP-only cookies
- JWT tokens with 7-day expiration
- Role-based access control (Admin/User)
- Admin user management interface
- User profile display in sidebar

## Quick Start

### 1. Install Dependencies

Dependencies have been added to `package.json`. Install them:

```bash
npm install
```

Required packages:
- `bcrypt` - Password hashing
- `jose` - JWT token generation/verification
- `@types/bcrypt` - TypeScript types

### 2. Create Database Tables

Run the migration to create the users table:

```bash
# Option 1: Manual SQL execution
psql $DATABASE_URL < db/migrations/003_create_users_table.sql

# Option 2: Using the migrate script
npm run migrate
```

The migration creates:
- `users` table with email, password_hash, name, role, created_at, last_login, is_active
- Index on email for fast lookups
- Index on role for filtering

### 3. Set Environment Variables

Add to your `.env.local` or Railway environment variables:

```bash
JWT_SECRET=your-random-secret-key-min-32-chars-long
```

**Important**: In production, use a strong randomly generated string (minimum 32 characters).

Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Create Initial Admin User

Run the seed script to create the first admin user:

```bash
node scripts/seed-admin.js
```

This will create:
- **Email**: `admin@silostorage.com`
- **Password**: `Admin123!`
- **Role**: Admin

**⚠️ Important**: Change this password immediately after first login!

## Architecture

### Authentication Flow

```
Login Page → POST /api/auth/login → Verify credentials → Generate JWT
    ↓
Set HTTP-only cookie → Redirect to dashboard
    ↓
Middleware validates cookie on each request → Extracts user info
```

### Key Components

#### 1. **lib/auth.ts** - Core Authentication Logic
- `hashPassword()` - Secure password hashing with bcrypt
- `verifyPassword()` - Compare password with hash
- `generateToken()` - Create JWT token
- `verifyToken()` - Validate and decode JWT
- `setAuthCookie()` - Set HTTP-only session cookie
- `getAuthCookie()` - Retrieve session cookie
- `clearAuthCookie()` - Remove session cookie
- `validatePasswordStrength()` - Enforce password requirements

#### 2. **middleware.ts** - Route Protection
- Intercepts all requests
- Validates authentication token
- Redirects unauthenticated users to `/login`
- Public routes: `/login`, `/api/auth/login`

#### 3. **API Routes** - Authentication Endpoints

**POST /api/auth/login**
```json
Request:
{
  "email": "admin@silostorage.com",
  "password": "Admin123!"
}

Response:
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
- Clears session cookie
- Redirects to login page

**GET /api/auth/me**
- Returns current logged-in user data
- Requires valid session cookie

**GET /api/users** (Admin only)
- Returns list of all users
- Only accessible to admin role

**POST /api/users** (Admin only)
```json
Request:
{
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user"
}

Response:
{
  "success": true,
  "user": {...},
  "temporaryPassword": "GeneratedPassword123!"
}
```

**DELETE /api/users?id=123** (Admin only)
- Deactivates user account
- Cannot delete last admin

## User Management

### Admin Panel

Access the admin user management at `/settings`:

1. **View Users**: See all users with their roles and last login times
2. **Add User**: Create new users with temporary passwords
3. **Delete User**: Deactivate user accounts (soft delete)

### User Roles

- **Admin**: Full access to user management and all dashboard features
- **User**: Access to dashboard data, no user management

## Sidebar Integration

The sidebar now displays:
- User's name and initials in avatar
- Current role badge
- Dropdown menu with:
  - Email display
  - Logout button

## Login Page

- Modern, clean UI at `/login`
- Email and password fields
- Error messages for failed login
- Auto-redirect if already logged in
- Responsive design

## Password Security

### Password Requirements

Passwords must contain:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Password Storage

- Bcrypt hashing with 12 rounds (cost factor)
- Never stored in plain text
- Cannot be recovered - only reset

## Session Management

### Cookies

- **Name**: `auth-token`
- **Type**: HTTP-only (prevents XSS attacks)
- **Secure Flag**: Enabled in production
- **SameSite**: Lax
- **Duration**: 7 days

### Token Expiration

- JWT tokens expire after 7 days
- Expired tokens automatically trigger re-authentication
- Users are redirected to login page

## Deployment Considerations

### Railway Deployment

1. Add `JWT_SECRET` to Railway environment variables
2. Ensure `DATABASE_URL` is configured
3. Run migrations on deployment:
   ```bash
   npm run migrate && node scripts/seed-admin.js
   ```

### Security Checklist

- [ ] `JWT_SECRET` is set (minimum 32 random characters)
- [ ] DATABASE_URL is configured correctly
- [ ] Users table migration has been run
- [ ] Initial admin user has been created
- [ ] Admin password has been changed from default
- [ ] HTTPS is enforced in production
- [ ] HTTP-only cookies are enabled

## Troubleshooting

### "Unauthorized" on Login
- Check DATABASE_URL is correct
- Verify users table exists
- Ensure admin user was created with seed script
- Check email/password are correct

### Session Not Persisting
- Verify middleware.ts is at project root
- Check `JWT_SECRET` environment variable is set
- Ensure cookies are enabled in browser
- Check cookie configuration (secure flag for HTTPS)

### User Can Access Before Login
- Verify middleware.ts is configured
- Check Next.js version (requires 14+)
- Ensure public routes whitelist is correct in middleware

### Can't Create Users
- Verify current user is admin
- Check email doesn't already exist
- Ensure user has valid email format
- Check database connection

## Testing

### Test Login Flow
1. Navigate to `http://localhost:3000/login`
2. Enter admin credentials (admin@silostorage.com / Admin123!)
3. Should redirect to dashboard
4. User info should appear in sidebar

### Test User Management
1. Log in as admin
2. Go to Settings (`/settings`)
3. Click "Add User"
4. Create a new user
5. Copy temporary password
6. Log out and test new user login

### Test Session Expiration
1. Log in
2. Wait 7 days (or modify token expiration in lib/auth.ts for testing)
3. User should be redirected to login

## Future Enhancements

Potential improvements for future releases:
- OAuth2 integration (Google, Microsoft)
- Two-factor authentication
- Password reset via email
- User profile settings/preferences
- Audit logging of admin actions
- Session management (view active sessions)
- Password change requirement after X days
- IP-based access restrictions
- Rate limiting on login attempts

