"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "홈" },
  { href: "/calendar", label: "캘린더" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-4">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`text-xs ${
              active
                ? "font-semibold text-c-text-strong"
                : "text-c-text-faint hover:text-c-text-muted"
            }`}
            data-anim
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
