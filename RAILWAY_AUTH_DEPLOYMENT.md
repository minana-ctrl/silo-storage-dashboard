# Railway Deployment Guide - Authentication System

## 🚀 Deploying to Railway

This guide covers deploying the Silo Storage Dashboard with authentication to Railway.

---

## Prerequisites

Before deploying:
- [ ] Railway project created
- [ ] PostgreSQL database provisioned
- [ ] Git repository configured
- [ ] All authentication code committed

---

## Step 1: Configure Database

### Create PostgreSQL Plugin
1. Go to Railway dashboard
2. Click "+ Create" 
3. Select "PostgreSQL"
4. Wait for database to initialize

### Get Database URL
1. Go to PostgreSQL plugin
2. Click "Connect"
3. Copy connection string
4. Format: `postgresql://user:password@host:port/database`

---

## Step 2: Set Environment Variables

### In Railway Dashboard
1. Go to your Next.js service
2. Click "Variables"
3. Add the following variables:

```
DATABASE_URL = <paste-postgresql-connection-string>

JWT_SECRET = <generate-and-paste-secure-secret>
```

### Generate JWT_SECRET
Run locally:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output and paste into Railway.

**Example JWT_SECRET:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z
```

---

## Step 3: Configure Build & Start Commands

### Railway Settings
1. Go to "Settings" 
2. Ensure Node.js version is 18+

### Environment
```
NODE_ENV = production
```

### Build Command
```
npm install && npm run migrate
```

### Start Command
```
npm run start:next
```

---

## Step 4: Run Migrations & Seed

### Option A: During First Deploy (Recommended)

Update `package.json` build script to include seed:
```json
{
  "scripts": {
    "build": "next build && npm run migrate && node scripts/seed-admin.js"
  }
}
```

### Option B: Manual Execution

After first deploy:
1. SSH into Railway environment
2. Run:
   ```bash
   npm run migrate
   node scripts/seed-admin.js
   ```

---

## Step 5: Deploy

### Push to GitHub
```bash
git add .
git commit -m "feat: add authentication system"
git push origin main
```

### Railway Auto-Deploy
1. Railway detects push
2. Installs dependencies
3. Builds application
4. Runs migrations
5. Seeds admin user
6. Starts server

---

## Verification Checklist

### After Deployment
- [ ] Application starts without errors
- [ ] Navigate to production URL
- [ ] Redirected to /login
- [ ] Login page displays correctly
- [ ] Can log in with admin@silostorage.com / Admin123!
- [ ] Dashboard loads with user profile
- [ ] Settings page accessible (admin only)
- [ ] Logout button works
- [ ] No errors in Railway logs

### Database Verification
```bash
# SSH into Railway container
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
# Should return: count=1 (the admin user)

psql $DATABASE_URL -c "SELECT email, role FROM users;"
# Should show: admin@silostorage.com | admin
```

---

## Troubleshooting

### "Connection refused" on Deploy
**Issue**: DATABASE_URL not set or invalid
```bash
# Check variable
echo $DATABASE_URL

# Expected format
postgresql://user:password@host:port/database
```

**Solution**: Verify DATABASE_URL in Railway variables

### "No users found" on Login
**Issue**: Migrations didn't run or seed script failed
```bash
# SSH into container
npm run migrate
node scripts/seed-admin.js
```

### Migrations Failed
**Issue**: Users table already exists or syntax error
```bash
# Check if table exists
psql $DATABASE_URL -c "\dt users;"

# If exists, confirm and continue
# If doesn't, run: npm run migrate
```

### JWT_SECRET Not Set
**Error**: "default-secret-key-change-in-production" warning

**Solution**: 
1. Go to Railway variables
2. Add JWT_SECRET with strong random string
3. Redeploy

---

## Monitoring & Logs

### View Logs
1. Go to Railway dashboard
2. Click your Next.js service
3. View "Logs" tab

### Common Log Messages

**Success**:
```
> npm run migrate
Migrations completed successfully

> node scripts/seed-admin.js
✓ Admin user created successfully!
Email:    admin@silostorage.com
Password: Admin123!
```

**Errors to Watch**:
- `ECONNREFUSED` - Database not available
- `duplicate key value violates unique constraint` - User already exists
- `JWT_SECRET` warnings - Set environment variable

---

## Post-Deployment Tasks

### 1. Change Default Admin Password
```bash
# SSH into container or connect directly
# Update password in database (future: implement password change UI)
```

### 2. Create Additional Users
1. Log in as admin@silostorage.com
2. Go to Settings
3. Click "Add User"
4. Fill in email, name, role
5. Share temporary password with user

### 3. Enable Monitoring
- Set up email notifications for errors
- Monitor login failures
- Track user activity

### 4. Backup Database
1. Enable automated backups in Railway
2. Set backup schedule (daily recommended)
3. Test backup restoration

---

## Scaling Considerations

### Database Connection Pool
Current settings in `lib/db.ts`:
```typescript
max: 25,          // Max connections
min: 5,           // Min idle connections
idleTimeoutMillis: 30000,  // 30 seconds
```

For high traffic, adjust:
- Increase `max` connections
- Increase `min` connections
- Adjust timeout values

### Caching Strategy
Consider adding caching for:
- User profile data
- Current user lookups
- Session data

### Performance Monitoring
1. Enable Railway metrics
2. Monitor database query time
3. Track authentication endpoint response times

---

## SSL/HTTPS

Railway automatically provides HTTPS:
- ✅ SSL certificate included
- ✅ Automatic renewal
- ✅ Force HTTPS enabled by default

**In production**, verify:
```bash
curl -I https://your-domain.railway.app
# Should show: HTTP/2 302 or 200
```

---

## Environment Variables Reference

### Required
```
DATABASE_URL    PostgreSQL connection string (required)
JWT_SECRET      Random string min 32 chars (required)
```

### Optional
```
NODE_ENV        production (set by Railway)
NEXT_PUBLIC_*   Frontend variables (if any)
```

### Do Not Expose
```
PASSWORD_SALT           (generated by bcrypt)
AUTH_COOKIE_SECRET      (generated by jose)
```

---

## Maintenance

### Daily
- Monitor error logs
- Check login success rates
- Verify database connection

### Weekly
- Review user list
- Check for inactive users
- Monitor response times

### Monthly
- Test backup restoration
- Review security logs
- Update dependencies
- Test disaster recovery

---

## Rollback Procedure

If deployment has issues:

### Option 1: Redeploy Previous Version
```bash
git revert HEAD
git push origin main
# Railway auto-deploys previous commit
```

### Option 2: Manual Rollback
1. Go to Railway deployments
2. Click "Rollback" on previous deployment
3. Confirm

---

## Updating Authentication

### Update Dependencies
```bash
npm update bcrypt jose
git commit -m "chore: update auth dependencies"
git push
```

### Update JWT Secret
1. Generate new secret
2. Update in Railway variables
3. Existing sessions will still work
4. New logins use new secret

### Update Password Requirements
Edit `lib/auth.ts` and modify `validatePasswordStrength()` function.

---

## Production Checklist

Before marking as production-ready:

- [ ] Admin password changed from default
- [ ] JWT_SECRET is strong (32+ random chars)
- [ ] DATABASE_URL is secure
- [ ] HTTPS working
- [ ] Backups enabled
- [ ] Error monitoring enabled
- [ ] All endpoints tested
- [ ] Load testing completed
- [ ] Security audit done
- [ ] Documentation updated

---

## Support & Help

### Railway Support
- Docs: https://docs.railway.app
- Community: Railway Discord
- Status: https://railway.app/status

### Debug Commands

```bash
# SSH into container
railway shell

# Check environment variables
env | grep -E "DATABASE|JWT"

# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check users table
psql $DATABASE_URL -c "SELECT email, role FROM users;"

# View application logs
tail -f /app/logs
```

---

## Cost Estimation (as of 2024)

| Service | Estimated Cost | Notes |
|---------|---|---|
| Next.js (2GB RAM) | $5/month | Minimal traffic |
| PostgreSQL (1GB) | $5/month | Small database |
| **Total** | **$10/month** | For small team |

Pricing scales with usage.

---

## Performance Optimization

### Enable Caching
1. Add Redis plugin (optional)
2. Cache user data for 5 minutes
3. Cache authentication lookups

### Database Optimization
- Indexes on email (already done)
- Indexes on role (already done)
- Monitor slow queries

### Next.js Optimization
- Enable ISR where applicable
- Use static generation
- Optimize images

---

## Version Information

- **Next.js**: 14.2.0+
- **Node.js**: 18+
- **PostgreSQL**: 12+
- **bcrypt**: 5.1.1+
- **jose**: 5.2.3+

---

## Disaster Recovery

### Restore from Backup
1. Create new PostgreSQL database
2. Restore backup file
3. Update DATABASE_URL
4. Redeploy application

### Data Loss Prevention
- Daily automated backups
- Weekly manual backups
- Test restoration monthly

---

## Compliance & Security

### Security Practices Implemented
- ✅ HTTPS/SSL encryption
- ✅ Password hashing (bcrypt)
- ✅ HTTP-only cookies
- ✅ CSRF token (built-in)
- ✅ Rate limiting (can be added)
- ✅ Input validation

### Compliance Considerations
- GDPR: User data stored in EU/US (depends on DB location)
- SOC 2: Consider for enterprise
- Audit logging: Can be added

---

## Quick Reference

### Deploy a Change
```bash
git add .
git commit -m "message"
git push origin main
# Railway auto-deploys
```

### View Logs
```bash
railway logs
```

### SSH to Container
```bash
railway shell
```

### Set Variable
```bash
railway variables set KEY=value
```

---

**Last Updated**: December 2024  
**Railway Deployment Guide v1.0**

For questions, see `AUTH_SETUP.md` for comprehensive documentation.


