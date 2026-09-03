"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Settings } from "lucide-react";
import { Button } from "@bubba/ui";
import { cn } from "@bubba/ui";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-1.5 text-lg font-semibold transition-colors",
        active
          ? "bg-primary text-white shadow-md"
          : "text-slate-400 hover:bg-slate-800 hover:text-white",
      )}
    >
      {children}
    </Link>
  );
}

const SETTINGS_ITEMS = [
  { href: "/slideshow", label: "Carrusel" },
  { href: "/payments", label: "Pagos" },
  { href: "/printer", label: "Impresora" },
  { href: "/users", label: "Usuarios" },
];

function SettingsMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = SETTINGS_ITEMS.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  useEffect(() => {
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Configuración"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "h-9 w-9 text-slate-300 hover:bg-slate-800 hover:text-white",
          active && "text-white",
        )}
      >
        <Settings className="h-5 w-5" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-md border border-slate-700 bg-slate-900 p-1 shadow-xl">
          {SETTINGS_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AdminNav({ userName }: { userName: string }) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
      <div className="flex items-center gap-2 font-bold">
        <span className="inline-block h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-700" />
        <span>Bubba Admin</span>
      </div>
      <nav className="flex items-center gap-1">
        <NavLink href="/">Dashboard</NavLink>
        <NavLink href="/menu">Menú</NavLink>
        <NavLink href="/orders">Pedidos</NavLink>
        <NavLink href="/reports">Reportes</NavLink>
      </nav>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{userName}</span>
        <SettingsMenu />
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Salir
        </Button>
      </div>
    </header>
  );
}
