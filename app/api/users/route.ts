import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookie, verifyToken, hashPassword, generatePassword, User } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users - List all users (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getAuthCookie();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await query<User>(
      'SELECT id, email, name, role, created_at, last_login, is_active FROM users ORDER BY created_at DESC'
    );

    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users - Create a new user (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const token = await getAuthCookie();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email, name, role = 'user' } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    if (!['admin', 'user'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await queryOne(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Generate temporary password
    const tempPassword = await generatePassword(12);
    const passwordHash = await hashPassword(tempPassword);

    // Create user
    const result = await queryOne<User>(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at, last_login, is_active',
      [email, passwordHash, name, role]
    );

    return NextResponse.json({
      success: true,
      user: result,
      temporaryPassword: tempPassword,
      note: 'User should change password on first login',
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id] - Delete a user (admin only)
 * Note: This uses a query parameter approach instead of dynamic routes
 * Usage: DELETE /api/users?id=123
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = await getAuthCookie();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await queryOne(
      'SELECT id FROM users WHERE id = $1',
      [parseInt(userId)]
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Don't allow deleting the last admin
    const adminCount = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE role = $1',
      ['admin']
    );

    if (adminCount && parseInt(adminCount.count) <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last admin user' },
        { status: 400 }
      );
    }

    // Delete user (or set is_active to false for soft delete)
    await query(
      'UPDATE users SET is_active = false WHERE id = $1',
      [parseInt(userId)]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

