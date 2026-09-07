"use client";

import { useState } from "react";
import { Pencil, UserPlus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
} from "@bbspos/ui";
import {
  RoleLabel,
  RoleListAll,
  ShiftLabel,
  ShiftList,
  Role as RoleValue,
  type Role,
  type Shift,
  type StaffUser,
} from "@bbspos/types";
import {
  createUser,
  setUserActive,
  updateUser,
} from "@/app/actions/users";

function runAction(fn: () => Promise<void>, onError: (msg: string) => void) {
  fn().catch((e) => onError(e instanceof Error ? e.message : "Ocurrió un error."));
}

type DialogState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; user: StaffUser };

/** Roles que el actor puede otorgar. El ADMIN no asigna ADMIN ni SUPER_ADMIN. */
function roleOptionsForActor(actorRole: Role): Role[] {
  return actorRole === "SUPER_ADMIN"
    ? RoleListAll
    : [RoleValue.CAJERO, RoleValue.MESERO];
}

export function UsersClient({
  users,
  currentUserId,
  currentUserRole,
}: {
  users: StaffUser[];
  currentUserId: string;
  currentUserRole: Role;
}) {
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSuper = currentUserRole === "SUPER_ADMIN";

  /** El actor puede gestionar a este usuario (editar o dar de baja). */
  function canManage(user: StaffUser): boolean {
    if (user.role === "SUPER_ADMIN") return false;
    if (user.id === currentUserId) return true;
    if (user.role === "ADMIN" && !isSuper) return false;
    return true;
  }

  /** El actor puede cambiar el rol de este usuario. */
  function canEditRole(user: StaffUser): boolean {
    if (user.id === currentUserId) return false;
    if (user.role === "SUPER_ADMIN") return false;
    return canManage(user);
  }

  /** El turno del Super Admin está congelado para todo el mundo. */
  function shiftIsLocked(user: StaffUser): boolean {
    return user.role === "SUPER_ADMIN";
  }

  function closeDialog() {
    setDialog({ kind: "none" });
    setError(null);
  }

  const baseRoleOptions = roleOptionsForActor(currentUserRole);
  const targetRole = dialog.kind === "edit" ? dialog.user.role : null;
  const roleOptions =
    targetRole && !baseRoleOptions.includes(targetRole)
      ? [...baseRoleOptions, targetRole]
      : baseRoleOptions;

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Usuarios</h1>
          <p className="text-muted-foreground">
            Gestión del personal: altas, bajas, roles y contraseñas.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setNotice(null);
            setDialog({ kind: "create" });
          }}
        >
          <UserPlus className="mr-1 h-4 w-4" /> Nuevo usuario
        </Button>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {notice && (
        <p className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          {notice}
        </p>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Usuario</th>
                <th className="px-4 py-2 font-medium">Rol</th>
                <th className="px-4 py-2 font-medium">Turno</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2 font-medium">
                    {user.name}
                    {user.id === currentUserId && (
                      <span className="ml-2 text-xs text-muted-foreground">(tú)</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{user.username}</td>
                  <td className="px-4 py-2">
                    <Badge
                      variant={
                        user.role === "SUPER_ADMIN"
                          ? "warning"
                          : user.role === "ADMIN"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {RoleLabel[user.role]}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={user.shift === "SIN_TURNO" ? "secondary" : "default"}>
                      {ShiftLabel[user.shift]}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={user.active ? "success" : "destructive"}>
                      {user.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    {canManage(user) ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setNotice(null);
                            setDialog({ kind: "edit", user });
                          }}
                        >
                          <Pencil className="mr-1 h-4 w-4" /> Editar
                        </Button>
                        {user.active ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={user.id === currentUserId}
                            title={
                              user.id === currentUserId
                                ? "No puedes desactivar tu propia cuenta"
                                : undefined
                            }
                            onClick={() => {
                              if (
                                !confirm(
                                  `¿Dar de baja a ${user.name}? No podrá iniciar sesión y podrás reactivarlo después.`,
                                )
                              ) {
                                return;
                              }
                              runAction(async () => {
                                await setUserActive(user.id, false);
                                setNotice(`${user.name} fue dado de baja.`);
                              }, setError);
                            }}
                          >
                            Dar de baja
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              runAction(async () => {
                                await setUserActive(user.id, true);
                                setNotice(`${user.name} fue reactivado.`);
                              }, setError);
                            }}
                          >
                            Reactivar
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="block text-right text-xs text-muted-foreground">
                        Cuenta protegida
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {dialog.kind !== "none" && (
        <UserDialog
          dialog={dialog}
          roleOptions={roleOptions}
          roleLocked={
            dialog.kind === "edit" ? !canEditRole(dialog.user) : false
          }
          shiftLocked={
            dialog.kind === "edit" ? shiftIsLocked(dialog.user) : false
          }
          onClose={closeDialog}
        />
      )}
    </div>
  );
}

function UserDialog({
  dialog,
  roleOptions,
  roleLocked,
  shiftLocked,
  onClose,
}: {
  dialog: Exclude<DialogState, { kind: "none" }>;
  roleOptions: Role[];
  roleLocked: boolean;
  shiftLocked: boolean;
  onClose: () => void;
}) {
  const isEdit = dialog.kind === "edit";
  const target = isEdit ? dialog.user : null;

  const [name, setName] = useState(target?.name ?? "");
  const [username, setUsername] = useState(target?.username ?? "");
  const [role, setRole] = useState<Role>(target?.role ?? "CAJERO");
  const [shift, setShift] = useState<Shift>(target?.shift ?? "SIN_TURNO");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    runAction(async () => {
      if (isEdit && target) {
        await updateUser({
          userId: target.id,
          name,
          role,
          shift,
          newPassword: newPassword || undefined,
        });
      } else {
        await createUser({ name, username, password, role, shift });
      }
      onClose();
    }, (msg) => {
      setError(msg);
      setSaving(false);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-bold">
            {isEdit ? `Editar ${target?.name}` : "Nuevo usuario"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isEdit && (
              <div className="space-y-1">
                <Label htmlFor="u-username">Usuario</Label>
                <Input
                  id="u-username"
                  type="text"
                  autoComplete="off"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej. cajero_turno1"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="u-name">Nombre</Label>
              <Input
                id="u-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="u-role">Rol</Label>
              {roleLocked && target ? (
                <div className="flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm text-muted-foreground">
                  {RoleLabel[target.role]}
                </div>
              ) : (
                <select
                  id="u-role"
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm [&>option]:bg-card [&>option]:text-foreground"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>
                      {RoleLabel[r]}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="u-shift">Turno</Label>
              {shiftLocked ? (
                <div className="flex h-9 items-center rounded-md border border-input bg-card px-3 text-sm text-muted-foreground">
                  {ShiftLabel[target!.shift]}
                </div>
              ) : (
                <select
                  id="u-shift"
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm [&>option]:bg-card [&>option]:text-foreground"
                  value={shift}
                  onChange={(e) => setShift(e.target.value as Shift)}
                >
                  {ShiftList.map((s) => (
                    <option key={s} value={s}>
                      {ShiftLabel[s]}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {isEdit ? (
              <div className="space-y-1">
                <Label htmlFor="u-newpass">Nueva contraseña (opcional)</Label>
                <Input
                  id="u-newpass"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Dejar vacío para no cambiarla"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="u-pass">Contraseña</Label>
                <Input
                  id="u-pass"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear usuario"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}