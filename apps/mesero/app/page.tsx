import { getRequiredSession } from "@/lib/session";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { SignOutButton } from "@/components/sign-out-button";
import { getPosCatalog } from "@/actions/pos";

export default async function MeseroPage() {
  const session = await getRequiredSession();
  const catalog = await getPosCatalog();

  return (
    <main className="h-full overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-[950px] px-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-2 font-bold">
            <span className="inline-block h-6 w-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700" />
            <span>Bubba Mesero</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {session.user.name ?? ""}
            </span>
            <SignOutButton />
          </div>
        </div>
      </div>
      <div className="mx-auto mt-4 w-full max-w-[950px] px-4 lg:px-6">
        <PosTerminal catalog={catalog} />
      </div>
    </main>
  );
}
