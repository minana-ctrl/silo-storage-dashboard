'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { User } from '@/lib/auth';

const menuItems = [
  { name: 'Analytics', path: '/analytics' },
  { name: 'Conversations', path: '/conversations' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="fixed left-0 top-0 h-screen w-[250px] bg-white border-r border-border flex flex-col">
      {/* Logo */}
      <div className="w-[250px] h-[128px] border-b border-border flex items-center justify-start overflow-hidden bg-white">
        <img
          src="/images/logo.svg"
          alt="Silo Storage Logo"
          width={250}
          height={128}
          className="w-full h-full object-contain object-left"
          style={{
            minWidth: '250px',
            minHeight: '128px'
          }}
          onError={(e) => {
            console.error('Logo failed to load. Check console for details.');
            const target = e.target as HTMLImageElement;
            target.style.border = '2px solid red';
            target.alt = 'Logo failed to load';
          }}
          onLoad={() => {
            console.log('Logo loaded successfully');
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`block px-4 py-2 rounded transition-colors ${isActive
                      ? 'text-primary-red border-l-4 border-primary-red bg-red-50'
                      : 'text-text-dark hover:text-primary-red hover:bg-gray-50'
                    }`}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/settings"
              className={`block px-4 py-2 rounded transition-colors ${pathname === '/settings'
                  ? 'text-primary-red border-l-4 border-primary-red bg-red-50'
                  : 'text-text-dark hover:text-primary-red hover:bg-gray-50'
                }`}
            >
              Settings
            </Link>
          </li>
        </ul>
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-border">
        {loading ? (
          <div className="text-xs text-text-muted">Loading...</div>
        ) : user ? (
          <div className="relative">
            <button
              onClick={() => setShowLogout(!showLogout)}
              className="w-full flex items-center gap-3 hover:bg-gray-50 p-2 rounded transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary-red flex items-center justify-center text-white font-heading text-sm flex-shrink-0">
                {getInitials(user.name)}
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-body text-text-dark truncate">{user.name}</p>
                <p className="text-xs font-body text-text-muted capitalize">{user.role}</p>
              </div>
              <svg
                className={`w-4 h-4 text-text-muted transition-transform ${showLogout ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>

            {/* Logout Dropdown */}
            {showLogout && (
              <div className="absolute bottom-full left-0 right-0 bg-white border border-border rounded-lg shadow-lg mb-2">
                <p className="text-xs text-text-muted px-3 py-2 border-b border-border">
                  {user.email}
                </p>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-b-lg"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-text-muted">Not logged in</div>
        )}
      </div>
    </div>
  );
}


