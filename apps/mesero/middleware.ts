import { withAuth } from "next-auth/middleware";
import { Role } from "@bubba/types";

const sessionCookie = {
  name:
    process.env.NODE_ENV === "production"
      ? "mesero.session-token"
      : "mesero.session-token.dev",
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
      const role = token.role ?? Role.MESERO;
      return (
        role === Role.MESERO ||
        role === Role.CAJERO ||
        role === Role.ADMIN
      );
    },
  },
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/((?!login|api/auth|manifest\\.json|icon[^/]*\\.(?:png|svg)|_next/static|_next/image|favicon\\.ico|sw\\.js).*)"],
};
