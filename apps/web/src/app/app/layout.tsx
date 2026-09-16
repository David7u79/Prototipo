import Link from 'next/link';
import type { ReactNode } from 'react';
import { logoutAction } from '@/app/app-actions';

type NavigationItem = {
  href?: '/app' | '/app/profile';
  label: string;
};

const navigation: NavigationItem[] = [
  { href: '/app', label: 'Inicio' },
  { href: '/app/profile', label: 'Perfil' },
  { label: 'Entrenamientos' },
  { label: 'Historial' },
  { label: 'Marcas' },
  { label: 'Progreso' },
  { label: 'Movimientos' },
  { label: 'Asistente IA' },
];

function NavigationLink({ item }: { item: NavigationItem }) {
  if (item.href) {
    return (
      <Link
        className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-emerald-50"
        href={item.href}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <span className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-muted">
      {item.label}
      <small className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">Próximamente</small>
    </span>
  );
}

function AppSidebar() {
  return (
    <aside className="border-b border-line bg-panel p-5 md:border-r">
      <Link className="block text-xl font-black tracking-tight text-brand" href="/app">
        GarFit
      </Link>
      <p className="mt-1 text-xs text-muted">Entrena · Registra · Evoluciona</p>
      <nav className="mt-7 flex gap-2 overflow-x-auto md:flex-col">
        {navigation.map((item) => (
          <NavigationLink item={item} key={item.label} />
        ))}
      </nav>
      <form action={logoutAction} className="mt-6">
        <button className="text-sm font-medium text-muted underline">Cerrar sesión</button>
      </form>
    </aside>
  );
}

export const dynamic = 'force-dynamic';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <AppSidebar />
      <main className="p-5 sm:p-8">{children}</main>
    </div>
  );
}
