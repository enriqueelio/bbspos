import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-700 text-lg font-bold text-white">
            B
          </div>
          <h1 className="text-2xl font-bold">BBSPOS Admin</h1>
          <p className="text-sm text-muted-foreground">
            Inicia sesión para gestionar tu restaurante.
          </p>
        </div>
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
