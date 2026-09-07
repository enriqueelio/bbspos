import { withAuth } from "next-auth/middleware";
import { Role } from "@bbspos/types";

// Debe coincidir con la configuración de cookies de lib/auth.ts para que
// el middleware lea el mismo sessionToken personalizado.
const sessionCookie = {
  name:
    process.env.NODE_ENV === "production"
      ? "cajero.session-token"
      : "cajero.session-token.dev",
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  },
};

export default withAuth({
  cookies: {
    sessionToken: sessionCookie,
  },
  callbacks: {
    authorized({ token }) {
      if (!token) return false;
      const role = token.role ?? Role.CAJERO;
      return (
        role === Role.CAJERO ||
        role === Role.ADMIN ||
        role === Role.SUPER_ADMIN ||
        role === Role.MESERO
      );
    },
  },
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
