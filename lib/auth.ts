'use server';

// Dynamic import for bcrypt to avoid webpack issues in middleware
let bcrypt: any;
if (typeof window === 'undefined') {
  try {
    bcrypt = require('bcrypt');
  } catch (e) {
    console.warn('bcrypt not available, password hashing disabled');
  }
}

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// Lazy getter for JWT_SECRET - only validates when actually needed at runtime
let cachedJWTSecret: Uint8Array | null = null;

function getJWTSecret(): Uint8Array {
  // Return cached value if already validated
  if (cachedJWTSecret) {
    return cachedJWTSecret;
  }

  // Validate JWT_SECRET exists and is strong enough
  const JWT_SECRET_STRING = process.env.JWT_SECRET;

  if (!JWT_SECRET_STRING) {
    throw new Error(
      'JWT_SECRET environment variable is not set. Authentication cannot function without a secure secret key.'
    );
  }

  if (JWT_SECRET_STRING.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters long for security. Please use a strong, random secret.'
    );
  }

  // Cache the encoded secret
  cachedJWTSecret = new TextEncoder().encode(JWT_SECRET_STRING);
  return cachedJWTSecret;
}

const TOKEN_EXPIRATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const COOKIE_NAME = 'auth-token';

export interface User {
  id: number;
  email: string;
  password_hash?: string; // Only included when fetching from DB for authentication
  name: string;
  role: 'admin' | 'user';
  created_at: string;
  last_login: string | null;
  is_active: boolean;
}

export interface JWTPayload {
  userId: number;
  email: string;
  role: 'admin' | 'user';
  iat: number;
  exp: number;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  if (!bcrypt) {
    throw new Error('bcrypt not available');
  }
  return bcrypt.hash(password, 12);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!bcrypt) {
    throw new Error('bcrypt not available');
  }
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token
 */
export async function generateToken(user: User): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJWTSecret());

  return token;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const verified = await jwtVerify(token, getJWTSecret());
    return verified.payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Set authentication cookie
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_EXPIRATION / 1000, // Convert to seconds
    path: '/',
  });
}

/**
 * Get authentication cookie
 */
export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

/**
 * Clear authentication cookie
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Get current user from cookie
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = await getAuthCookie();
  if (!token) {
    return null;
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return null;
  }

  // Fetch full user object from the database
  const { queryOne } = await import('@/lib/db');
  const user = await queryOne<User>(
    'SELECT id, email, name, role, created_at, last_login, is_active FROM users WHERE id = $1 AND is_active = true',
    [payload.userId]
  );

  return user;
}

/**
 * Generate a secure random password
 */
export async function generatePassword(length: number = 12): Promise<string> {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

/**
 * Validate password strength
 */
export async function validatePasswordStrength(password: string): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

