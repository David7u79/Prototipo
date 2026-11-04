import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { logoutAction } from '@/app/app-actions';
import { AppNav } from '@/components/app-nav';

export const metadata: Metadata = {
  title: 'Panel',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-ink md:grid md:grid-cols-[16rem_1fr]">
      <AppNav logoutAction={logoutAction} />
      <main className="w-full min-w-0 max-w-7xl p-4 pb-24 sm:p-6 md:pb-8 lg:p-8">
        {children}
      </main>
    </div>
  );
}
