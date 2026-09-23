// ===== Estilos compartidos de botones y contenedores del POS =====

export const TOP_LABEL =
  "text-sm font-bold uppercase tracking-widest text-slate-400";

export const CHIP_BASE =
  "inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-bold capitalize tracking-wide transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30";

export const CHIP = {
  selected:
    "border border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30",
  idle: "border border-slate-700 bg-slate-900/60 text-slate-200 hover:border-primary/60 hover:bg-slate-800 hover:text-white",
  amber:
    "border border-amber-500/40 bg-amber-500/10 text-amber-100 hover:border-amber-400 hover:bg-amber-500/20 hover:shadow-md hover:shadow-amber-500/10",
};

export const PRODUCT_BASE =
  "relative flex w-full items-center justify-center rounded-xl border px-2 py-2 text-sm font-semibold capitalize leading-tight tracking-wide whitespace-normal break-words transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30";

export const PRODUCT = {
  selected: "border-primary bg-primary/15 text-white shadow-md shadow-primary/20",
  idle: "border-slate-700 bg-slate-900/50 text-slate-100 hover:border-primary/60 hover:bg-slate-800",
};

export const PAY_BUTTON =
  "inline-flex h-10 items-center justify-center rounded-xl border text-sm font-bold capitalize tracking-wide transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40";