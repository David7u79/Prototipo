import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s · GarFit',
    default: 'GarFit',
  },
  description: 'Entrena, registra y evoluciona.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="flex min-h-full flex-col bg-bg text-ink antialiased">{children}</body>
    </html>
  );
}
