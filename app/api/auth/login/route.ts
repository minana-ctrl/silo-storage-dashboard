import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { verifyPassword, generateToken, setAuthCookie, User } from '@/lib/auth';
import { withRateLimit, RATE_LIMITS, getClientIp, resetRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Rate limiting - check both IP and email
    const clientIp = getClientIp(request);

    // Check IP-based rate limit
    const ipRateLimit = await withRateLimit(
      request,
      RATE_LIMITS.LOGIN_IP,
      'login:ip'
    );
    if (ipRateLimit) {
      return ipRateLimit;
    }

    // Check email-based rate limit
    const emailRateLimit = await withRateLimit(
      request,
      RATE_LIMITS.LOGIN_EMAIL,
      'login:email',
      email.toLowerCase()
    );
    if (emailRateLimit) {
      return emailRateLimit;
    }

    // Find user by email
    const user = await queryOne<User>(
      'SELECT id, email, password_hash, name, role, created_at, last_login, is_active FROM users WHERE email = $1',
      [email]
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: 'User account is inactive' },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash!);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Successful login - reset rate limits for this user
    resetRateLimit(`login:ip:${clientIp}`);
    resetRateLimit(`login:email:${email.toLowerCase()}`);

    // Update last login timestamp
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = await generateToken(user);

    // Set cookie
    await setAuthCookie(token);

    // Return user data (without password hash)
    const { password_hash, ...userWithoutPassword } = user;
    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

