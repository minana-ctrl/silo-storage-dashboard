'use client';

import { usePathname } from 'next/navigation';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname?.startsWith('/login');
  
  return (
    <main className={`flex-1 bg-background-white h-full overflow-y-auto ${isLoginPage ? 'ml-0' : 'ml-[250px]'}`}>
      {children}
    </main>
  );
}





