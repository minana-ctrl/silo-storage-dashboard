# Password Change Guide

## ✅ UI Password Change Feature Added

A password change interface has been added to the Settings page, available to **all users** (both admins and regular users).

## 📍 How to Change Your Password

### Step 1: Navigate to Settings
1. Log in to your dashboard
2. Click on **Settings** in the sidebar (or go to `/settings`)

### Step 2: Change Password Section
1. Look for the **"Change Password"** section at the top of the Settings page
2. Click the **"Change Password"** button

### Step 3: Fill in the Form
You'll need to provide:
- **Current Password**: Your existing password
- **New Password**: Your desired new password
- **Confirm New Password**: Re-type the new password to confirm

### Step 4: Submit
Click **"Update Password"** to save your new password.

## 🔐 Password Requirements

Your new password must meet these requirements:
- At least **8 characters** long
- Contains at least one **uppercase letter** (A-Z)
- Contains at least one **lowercase letter** (a-z)
- Contains at least one **number** (0-9)

## 👥 Current Admin Accounts

| Name | Email | Initial Password |
|------|-------|------------------|
| Conor | conor@strategynorth.io | StrategyNorth2024! |
| Michael | michael@silostorage.com.au | SiloStorage2024! |

## 🚨 Important Security Notes

1. **Change your password after first login** - The initial passwords are temporary
2. **Use a strong, unique password** - Don't reuse passwords from other sites
3. **Keep your password confidential** - Never share it via email or chat
4. **Change it regularly** - Consider updating your password every 90 days

## 🛠️ Troubleshooting

### "Current password is incorrect"
- Double-check you're entering your current password correctly
- Make sure Caps Lock is off
- If you've forgotten your password, contact an admin to reset it

### "Password does not meet requirements"
- Ensure your new password has:
  - At least 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number

### "New passwords do not match"
- Make sure both password fields are identical
- Copy-paste can sometimes include extra spaces - try typing manually

## 🔧 Admin: Reset a User's Password

If you're an admin and need to reset someone else's password:

1. Log in as admin
2. Go to Settings → User Management
3. **Delete** the user account
4. **Recreate** the account with the same or new email
5. Share the new temporary password with the user
6. Instruct them to change it immediately after logging in

## 📝 Technical Details

- Passwords are hashed using bcrypt with 12 rounds
- Password changes are logged in the security_events table
- Session remains valid after password change (no forced logout)
- API endpoint: `/api/auth/change-password`

