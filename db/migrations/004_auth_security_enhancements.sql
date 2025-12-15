-- Add security-related fields to users table
-- Migration 004: Authentication security enhancements

-- Add failed login tracking
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT false;

-- Create security audit log table
CREATE TABLE IF NOT EXISTS security_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on security events for faster queries
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE security_events IS 'Audit log for security-related events (login, logout, password changes, etc.)';
COMMENT ON COLUMN users.failed_login_attempts IS 'Counter for consecutive failed login attempts';
COMMENT ON COLUMN users.locked_until IS 'Account lockout expiration timestamp';
COMMENT ON COLUMN users.password_changed_at IS 'Last password change timestamp';
COMMENT ON COLUMN users.force_password_change IS 'Flag to force password change on next login';
