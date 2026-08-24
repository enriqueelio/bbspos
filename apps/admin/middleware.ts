import { withAuth } from "next-auth/middleware";
import { Role } from "@bubba/types";

export default withAuth({
  callbacks: {
    authorized({ token }) {
      if (!token) return false;
      return (token.role ?? Role.CAJERO) === Role.ADMIN;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/((?!login|api/auth|api/reports|_next/static|_next/image|favicon.ico).*)",
  ],
};
