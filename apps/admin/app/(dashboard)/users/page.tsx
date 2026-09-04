import { prisma } from "@bbspos/db";
import { getRequiredSession } from "@/lib/session";
import { UsersClient } from "./users-client";

export const metadata = {
  title: "Usuarios — Bubba Admin",
};

export default async function UsersPage() {
  const [session, users] = await Promise.all([
    getRequiredSession(),
    prisma.user.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        shift: true,
        active: true,
      },
    }),
  ]);

  return <UsersClient users={users} currentUserId={session.user.id} />;
}
