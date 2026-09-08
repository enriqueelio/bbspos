"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import { Button, Input, Label } from "@bbspos/ui";
import { ensureCashierRole, isAccountInactive } from "@/app/actions/auth";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (res?.error) {
      const inactive = await isAccountInactive(username, password);
      setError(
        inactive
          ? "Esta cuenta está desactivada. Contacta al administrador."
          : "Credenciales inválidas. Verifica tu usuario y contraseña.",
      );
      setLoading(false);
      return;
    }

    const allowed = await ensureCashierRole();
    if (!allowed) {
      await signOut({ redirect: false });
      setError(
        "Esta cuenta no tiene permisos de cajero. Contacta al administrador.",
      );
      setLoading(false);
      return;
    }

    router.push(callbackUrl || "/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Usuario</Label>
        <Input
          id="username"
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="cajero"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 transition-colors hover:text-white"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Iniciando sesión..." : "Iniciar sesión"}
      </Button>
    </form>
  );
}
