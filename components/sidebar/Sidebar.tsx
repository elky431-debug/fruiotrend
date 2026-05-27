"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Accueil", icon: "⌂", activeMatch: "__home__" },
  { href: "/dashboard", label: "Mes pubs", icon: "▦", activeMatch: "/dashboard" },
  { href: "/create", label: "+ Créer", icon: "+", accent: true, activeMatch: "/create" },
  { href: "/plans", label: "Plans", icon: "◎", activeMatch: "/plans" },
  { href: "/settings", label: "Paramètres", icon: "⚙", activeMatch: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-[200px] shrink-0 flex-col border-r border-bg-card bg-[#0D0D0D] md:flex">
        <Link
          href="/"
          className="flex items-center gap-2 border-b border-bg-card px-4 py-5 transition hover:opacity-80"
        >
          <span className="text-xl">📢</span>
          <span className="font-bold text-white">AdCreative</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => {
            const isActive =
              item.activeMatch === "__home__"
                ? pathname === "/"
                : pathname.startsWith(item.activeMatch);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-bg-card font-medium text-accent"
                    : "text-text-secondary hover:bg-bg-card hover:text-white"
                }`}
              >
                <span className={item.accent && isActive ? "text-accent" : ""}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav className="flex border-b border-bg-card bg-[#0D0D0D] md:hidden">
        {NAV.map((item) => {
          const isActive =
            item.activeMatch === "__home__"
              ? pathname === "/"
              : pathname.startsWith(item.activeMatch);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 py-3 text-center text-xs ${
                isActive ? "text-accent" : "text-text-secondary"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
