import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookie, verifyToken, hashPassword, validatePasswordStrength } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/change-password
 * Allow authenticated users to change their password
 */
export async function POST(request: NextRequest) {
    try {
        // Verify user is authenticated
        const token = await getAuthCookie();
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { error: 'Current password and new password are required' },
                { status: 400 }
            );
        }

        // Validate new password strength
        const validation = await validatePasswordStrength(newPassword);
        if (!validation.valid) {
            return NextResponse.json(
                { error: 'Password does not meet requirements', errors: validation.errors },
                { status: 400 }
            );
        }

        // Verify current password
        const { queryOne } = await import('@/lib/db');
        const { verifyPassword } = await import('@/lib/auth');

        const user = await queryOne<{ id: number; password_hash: string }>(
            'SELECT id, password_hash FROM users WHERE id = $1',
            [payload.userId]
        );

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const isValidPassword = await verifyPassword(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'Current password is incorrect' },
                { status: 401 }
            );
        }

        // Hash new password and update
        const newPasswordHash = await hashPassword(newPassword);
        await query(
            'UPDATE users SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP, force_password_change = false WHERE id = $2',
            [newPasswordHash, payload.userId]
        );

        // Log security event
        await query(
            'INSERT INTO security_events (user_id, event_type, ip_address) VALUES ($1, $2, $3)',
            [
                payload.userId,
                'password_changed',
                request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
            ]
        );

        return NextResponse.json({
            success: true,
            message: 'Password changed successfully',
        });
    } catch (error) {
        console.error('Change password error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
