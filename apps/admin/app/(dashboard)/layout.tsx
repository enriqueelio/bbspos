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
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <AdminNav userName={session.user.name ?? "Admin"} />
      {children}
    </div>
  );
}
