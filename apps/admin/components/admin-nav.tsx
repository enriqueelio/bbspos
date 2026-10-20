"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Settings } from "lucide-react";
import { Button } from "@bbspos/ui";
import { cn } from "@bbspos/ui";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-md px-3 py-1.5 text-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "bg-primary text-primary-foreground shadow-md"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

const SETTINGS_ITEMS = [
  { href: "/slideshow", label: "Carrusel" },
  { href: "/printer", label: "Impresora" },
  { href: "/menu", label: "Menú" },
  { href: "/payments", label: "Pagos" },
  { href: "/users", label: "Usuarios" },
  { href: "/customers", label: "Clientes" },
  { href: "/pensionados", label: "Pensionados" },
  { href: "/customers-ranking", label: "Lealtad / Frecuentes" },
];

function SettingsMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Escape" || !open) return;
    e.preventDefault();
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <div className="relative" ref={ref} onKeyDown={onKeyDown}>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        aria-label="Configuración"
        aria-expanded={open}
        aria-controls={open ? "admin-settings-menu" : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "h-11 w-11 text-muted-foreground hover:bg-accent hover:text-foreground",
          active && "text-foreground",
        )}
      >
        <Settings className="h-5 w-5" />
      </Button>
      {open && (
        <div
          id="admin-settings-menu"
          className="absolute left-1/2 top-full z-50 mt-2 w-48 -translate-x-1/2 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-xl"
        >
          {SETTINGS_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
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
    <header className="mb-6 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b pb-4">
      <div className="flex items-center gap-2 font-bold">
        <span className="inline-block h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-700" />
        <span>BBSPOS Admin</span>
      </div>
      <nav className="flex items-center gap-1">
        <NavLink href="/">Dashboard</NavLink>
        <NavLink href="/orders">Pedidos</NavLink>
        <NavLink href="/reports">Reportes</NavLink>
      </nav>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{userName}</span>
        <SettingsMenu />
        <Button
          variant="outline"
          size="sm"
          className="min-h-11"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Salir
        </Button>
      </div>
    </header>
  );
}
