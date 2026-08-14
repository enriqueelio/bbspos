import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getRequiredSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("No autorizado");
  }
  return session;
}
