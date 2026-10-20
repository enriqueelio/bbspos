import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    // Columna flex a altura de ventana: el navbar queda fuera del flujo
    // scrolleable y las páginasoccupan el alto restante. El contenedor de
    // children conserva `overflow-y-auto` para que las páginas normales
    // sigan haciendo scroll normal; las vistas que necesitan su propio
    // scroll interno (menú) ocupan `h-full` y scrollean adentro.
    <div className="mx-auto flex h-screen w-full max-w-6xl flex-col px-4 py-6">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
      >
        Saltar al contenido
      </a>
      <AdminNav userName={session.user.name ?? "Admin"} />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {children}
      </main>
    </div>
  );
}
