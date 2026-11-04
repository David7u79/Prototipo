'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { GarFitLogo } from '@/components/logo';

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

const desktopNavigation: NavItem[] = [
  { href: '/app', label: 'Inicio', exact: true },
  { href: '/app/workouts', label: 'Entrenamientos' },
  { href: '/app/workouts?status=COMPLETED', label: 'Historial', exact: true },
  { href: '/app/wods', label: 'WODs' },
  { href: '/app/records', label: 'Marcas' },
  { href: '/app/movements', label: 'Movimientos' },
  { href: '/app/ai', label: 'Asistente IA' },
  { href: '/app/profile', label: 'Perfil' },
];

const mobilePrimaryNav: NavItem[] = [
  { href: '/app', label: 'Inicio', exact: true },
  { href: '/app/workouts', label: 'Entrenamientos' },
  { href: '/app/wods', label: 'WODs' },
  { href: '/app/records', label: 'Marcas' },
];

const mobileMoreNav: NavItem[] = [
  { href: '/app/profile', label: 'Mi perfil' },
  { href: '/app/movements', label: 'Movimientos' },
  { href: '/app/ai', label: 'Asistente IA' },
  { href: '/app/workouts?status=COMPLETED', label: 'Historial de entrenamientos' },
];

function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AppNav({
  logoutAction,
}: {
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isMoreActive = mobileMoreNav.some((item) => isItemActive(pathname, item));

  return (
    <>
      {/* Cabecera móvil superior */}
      <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur md:hidden">
        <Link className="flex items-center gap-2.5 font-black text-ink no-underline" href="/app">
          <GarFitLogo size={28} />
          <span className="text-lg tracking-tight">GarFit</span>
        </Link>
        <Link
          className="rounded-full border border-line bg-raised px-3 py-1 text-xs font-semibold text-muted hover:text-ink"
          href="/app/profile"
        >
          Perfil
        </Link>
      </header>

      {/* Sidebar escritorio */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-line bg-surface p-6 md:flex">
        <div className="flex items-center gap-3">
          <GarFitLogo size={36} />
          <div>
            <Link className="block text-xl font-black tracking-tight text-ink no-underline" href="/app">
              GarFit
            </Link>
            <p className="text-[11px] font-medium text-muted">Entrena · Registra · Evoluciona</p>
          </div>
        </div>

        <nav aria-label="Navegación principal" className="mt-8 flex flex-1 flex-col gap-1.5">
          {desktopNavigation.map((item) => {
            const active = isItemActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-[10px] px-3.5 py-2.5 text-sm font-semibold transition ${
                  active
                    ? 'border border-accent/30 bg-accent-soft text-accent'
                    : 'text-muted hover:bg-raised hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line pt-4">
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full justify-start rounded-[10px] px-3.5 py-2 text-sm font-medium text-muted transition hover:bg-raised hover:text-danger"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Barra de navegación inferior móvil */}
      <nav
        aria-label="Navegación móvil inferior"
        className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-line bg-surface/95 px-2 pb-safe backdrop-blur md:hidden"
      >
        {mobilePrimaryNav.map((item) => {
          const active = isItemActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-1 rounded-[10px] px-2 py-1 text-[11px] font-semibold transition ${
                active ? 'text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              <NavIcon name={item.label} active={active} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setShowMoreMenu(true)}
          aria-expanded={showMoreMenu}
          aria-controls="mobile-more-menu"
          className={`flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-1 rounded-[10px] px-2 py-1 text-[11px] font-semibold transition ${
            isMoreActive || showMoreMenu ? 'text-accent' : 'text-muted hover:text-ink'
          }`}
        >
          <NavIcon name="Más" active={isMoreActive || showMoreMenu} />
          <span>Más</span>
        </button>
      </nav>

      {/* Menú "Más" móvil */}
      {showMoreMenu && (
        <div
          id="mobile-more-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Opciones adicionales"
          className="fixed inset-0 z-40 flex flex-col justify-end bg-bg/80 backdrop-blur-sm md:hidden"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="w-full rounded-t-3xl border-t border-line bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2">
                <GarFitLogo size={24} />
                <h2 className="text-base font-bold text-ink">Más opciones</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowMoreMenu(false)}
                className="rounded-full border border-line bg-raised px-3 py-1 text-xs font-semibold text-muted hover:text-ink"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {mobileMoreNav.map((item) => {
                const active = isItemActive(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMoreMenu(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`rounded-[10px] px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? 'border border-accent/30 bg-accent-soft text-accent'
                        : 'text-muted hover:bg-raised hover:text-ink'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 border-t border-line pt-4">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full justify-center rounded-[10px] border border-danger/30 bg-danger/10 py-3 text-sm font-bold text-danger transition hover:bg-danger/20"
                >
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? '#9B85FF' : 'currentColor';

  switch (name) {
    case 'Inicio':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'Entrenamientos':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 5v14M18 5v14M2 9v6M22 9v6M6 12h12" />
        </svg>
      );
    case 'WODs':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case 'Marcas':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      );
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      );
  }
}
