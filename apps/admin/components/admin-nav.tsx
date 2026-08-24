"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@bubba/ui";
import { cn } from "@bubba/ui";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {children}
    </Link>
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
        <NavLink href="/slideshow">Carrusel</NavLink>
        <NavLink href="/orders">Pedidos</NavLink>
        <NavLink href="/payments">Pagos</NavLink>
        <NavLink href="/reports">Reportes</NavLink>
        <NavLink href="/printer">Impresora</NavLink>
        <NavLink href="/users">Usuarios</NavLink>
      </nav>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{userName}</span>
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
