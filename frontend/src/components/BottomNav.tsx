'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/feed', label: 'フィード' },
  { href: '/records', label: '記録' },
  { href: '/groups', label: 'グループ' },
  { href: '/stats', label: '統計' },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-zinc-200 bg-white">
      {TABS.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 py-3 text-center text-sm font-medium ${
              active ? 'text-blue-600' : 'text-zinc-500'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
