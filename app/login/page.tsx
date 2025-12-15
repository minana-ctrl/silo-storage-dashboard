'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Success - redirect to dashboard
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-lg shadow-2xl p-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden bg-white">
            <img
              src="/favicon.jpg"
              alt="Silo Storage Logo"
              width={64}
              height={64}
              className="w-full h-full object-cover rounded-lg"
              style={{
                display: 'block',
                maxWidth: '100%',
                height: 'auto'
              }}
              onError={(e) => {
                console.error('Favicon failed to load:', e);
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-heading font-bold text-secondary-black text-center mb-2">
          Silo Storage Dashboard
        </h1>
        <p className="text-text-muted text-center mb-8 font-body">Sign in to your account</p>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm font-body">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-dark mb-2 font-body">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@silostorage.com"
              disabled={loading}
              className="w-full px-4 py-2 border border-border rounded focus:ring-2 focus:ring-primary-red focus:border-transparent outline-none transition disabled:bg-gray-50 disabled:text-text-muted font-body"
              style={{
                borderColor: 'rgba(229, 229, 229, 0.69)',
                backgroundColor: 'rgba(255, 255, 255, 1)'
              }}
              required
            />
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-dark mb-2 font-body">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="w-full px-4 py-2 border border-border rounded focus:ring-2 focus:ring-primary-red focus:border-transparent outline-none transition disabled:bg-gray-50 disabled:text-text-muted font-body"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 1)'
              }}
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-red hover:bg-red-600 disabled:bg-red-300 text-white font-medium py-2.5 rounded transition duration-200 font-body"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-text-muted text-xs mt-8 font-body">
          Internal system for company use only
        </p>
      </div>
    </div>
  );
}

