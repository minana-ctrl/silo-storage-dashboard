'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function ConditionalSidebar() {
  const pathname = usePathname();
  
  // Don't show sidebar on login page
  if (pathname?.startsWith('/login')) {
    return null;
  }
  
  return <Sidebar />;
}

