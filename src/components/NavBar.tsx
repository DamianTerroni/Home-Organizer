"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";

const TABS = [
  { href: "/", label: "Resumen", icon: "📊" },
  { href: "/expenses", label: "Gastos", icon: "💸" },
  { href: "/shopping-list", label: "Compras", icon: "🛒" },
  { href: "/settings", label: "Ajustes", icon: "⚙️" },
];

export default function NavBar({ householdName }: { householdName: string }) {
  const pathname = usePathname();

  return (
    <>
      <header className="hidden items-center justify-between border-b border-black/10 px-6 py-3 sm:flex dark:border-white/15">
        <span className="font-semibold">{householdName}</span>
        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={false}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                pathname === tab.href
                  ? "bg-[var(--accent)] text-white"
                  : "text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <form action={signOut}>
          <button className="text-sm text-black/50 hover:underline dark:text-white/50">
            Salir
          </button>
        </form>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-black/10 bg-[var(--background)] pb-[env(safe-area-inset-bottom)] sm:hidden dark:border-white/15">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch={false}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
              pathname === tab.href ? "text-[var(--accent)]" : "text-black/50 dark:text-white/50"
            }`}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
