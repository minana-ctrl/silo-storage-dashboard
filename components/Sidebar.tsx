'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { name: 'Analytics', path: '/analytics' },
  { name: 'Conversations', path: '/conversations' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="fixed left-0 top-0 h-screen w-[250px] bg-white border-r border-border flex flex-col">
      {/* Logo */}
      <div className="w-[250px] h-[128px] border-b border-border flex items-center justify-start overflow-hidden">
        <img
          src="/images/logo.svg?v=7"
          alt="Logo"
          style={{ 
            width: '250px', 
            height: '128px', 
            objectFit: 'fill', 
            objectPosition: 'left center',
            display: 'block',
            flexShrink: 0
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
                  className={`block px-4 py-2 rounded transition-colors ${
                    isActive
                      ? 'text-primary-red border-l-4 border-primary-red bg-red-50'
                      : 'text-text-dark hover:text-primary-red hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-red flex items-center justify-center text-white font-heading">
            U
          </div>
          <div>
            <p className="text-sm font-body text-text-dark">User</p>
            <p className="text-xs font-body text-text-muted">Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}


