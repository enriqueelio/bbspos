"use client";

import { useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from "@bbspos/ui";
import {
  BobaKind,
  BobaKindLabel,
  FlavorCategoryLabel,
  FlavorCategoryList,
  formatPrice,
  MenuCategory,
  MenuCategoryLabel,
  MenuCategoryList,
  Role,
  type BobaType,
  type DrinkPrice,
  type Flavor,
  type FlavorCategory as FlavorCategoryType,
  type MenuCategory as MenuCategoryType,
  type Size,
  type Topping,
} from "@bbspos/types";
import {
  createBoba,
  createFlavor,
  createMenuItem,
  createSize,
  createTopping,
  deleteBoba,
  deleteFlavor,
  deleteMenuItem,
  deleteSize,
  deleteTopping,
  saveDrinkPrices,
  setMenuItemMenuDelDia,
  updateBoba,
  updateFlavor,
  updateMenuItem,
  updateSize,
  updateTopping,
} from "@/app/actions/catalog";

export interface MenuItemAdminView {
  id: string;
  name: string;
  category: MenuCategoryType;
  price: number;
  description: string | null;
  options: { id: string; name: string; price: number }[];
  available: boolean;
  enMenuDelDiaHoy: boolean;
}

function CollapsibleCard({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-t-xl border-b border-slate-800 px-6 py-4 text-left transition-colors hover:bg-slate-900/50"
      >
        <span className="text-xl font-bold text-white">{title}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="p-6">{children}</div>
        </div>
      </div>
    </Card>
  );
}

function SubSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 border-b border-slate-800 px-4 py-3 text-left transition-colors hover:bg-slate-900/50"
      >
        <span className="text-base font-semibold text-white">{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function CategoryToggles({
  selected,
  onChange,
}: {
  selected: FlavorCategoryType[];
  onChange: (next: FlavorCategoryType[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FlavorCategoryList.map((c) => {
        const active = selected.includes(c);
        return (
          <button
            key={c}
            type="button"
            onClick={() =>
              onChange(
                active ? selected.filter((x) => x !== c) : [...selected, c],
              )
            }
            className={
              active
                ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                : "rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground"
            }
          >
            {FlavorCategoryLabel[c]}
          </button>
        );
      })}
    </div>
  );
}

function PriceMatrixEditor({
  category,
  sizes,
  bobaTypes,
  initialPrices,
}: {
  category: FlavorCategoryType;
  sizes: Size[];
  bobaTypes: BobaType[];
  initialPrices: DrinkPrice[];
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const s of sizes) {
      for (const b of bobaTypes) {
        const p = initialPrices.find(
          (x) => x.sizeId === s.id && x.bobaTypeId === b.id,
        );
        init[`${s.id}-${b.id}`] = p ? String(p.price) : "";
      }
    }
    return init;
  });
  const { toast } = useToast();

  async function save() {
    try {
      const prices = sizes.flatMap((s) =>
        bobaTypes.map((b) => ({
          sizeId: s.id,
          bobaTypeId: b.id,
          price: Number(values[`${s.id}-${b.id}`]),
        })),
      );
      await saveDrinkPrices({ category, prices });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "AcciÃ³n Denegada",
        description: e instanceof Error ? e.message : "OcurriÃ³ un error.",
        duration: 100000,
      });
    }
  }

  return (
    <div className="space-y-4">
      {sizes.length === 0 || bobaTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Registra al menos un tamaÃ±o y un tipo de boba para cargar la matriz.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left font-medium text-muted-foreground">
                  Vaso / Boba
                </th>
                {bobaTypes.map((b) => (
                  <th
                    key={b.id}
                    className="px-2 py-1 text-left font-medium text-muted-foreground"
                  >
                    {b.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sizes.map((s) => (
                <tr key={s.id}>
                  <td className="px-2 py-1 font-medium">
                    {s.name} Â· {s.oz} oz
                  </td>
                  {bobaTypes.map((b) => (
                    <td key={b.id} className="px-2 py-1">
                      <Input
                        type="number"
                        min="0"
                        className="h-9 w-24"
                        placeholder="Bs"
                        value={values[`${s.id}-${b.id}`]}
                        onChange={(e) =>
                          setValues({
                            ...values,
                            [`${s.id}-${b.id}`]: e.target.value,
                          })
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-end">
        <Button
          onClick={save}
          disabled={sizes.length === 0 || bobaTypes.length === 0}
        >
          Guardar matriz
        </Button>
      </div>
    </div>
  );
}

function MenuItemOptionsEditor({
  options,
  onChange,
}: {
  options: { name: string; price: string }[];
  onChange: (next: { name: string; price: string }[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">
        Variantes (Pollo / Res, etc.) â€” precio propio por variante
      </p>
      {options.map((opt, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            className="max-w-40"
            placeholder="Nombre variante"
            value={opt.name}
            onChange={(e) => {
              const next = [...options];
              next[i] = { ...next[i], name: e.target.value };
              onChange(next);
            }}
          />
          <Input
            className="max-w-24"
            type="number"
            min="1"
            placeholder="Bs"
            value={opt.price}
            onChange={(e) => {
              const next = [...options];
              next[i] = { ...next[i], price: e.target.value };
              onChange(next);
            }}
          />
          <Button
            variant="destructive"
            size="icon"
            className="h-8 w-8"
            onClick={() => onChange(options.filter((_, j) => j !== i))}
          >
            âœ•
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...options, { name: "", price: "" }])}
      >
        + Agregar variante
      </Button>
    </div>
  );
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function MenuSection({
  title,
  items,
  filteredItems,
  disponibles,
  query,
  onQueryChange,
  openNew,
  newButtonLabel,
  emptyText,
  showCategory,
  onToggle,
  onEdit,
  onDelete,
  isSuperAdmin,
}: {
  title: string;
  items: MenuItemAdminView[];
  filteredItems: MenuItemAdminView[];
  disponibles: number;
  query: string;
  onQueryChange: (q: string) => void;
  openNew: () => void;
  newButtonLabel: string;
  emptyText: string;
  showCategory: boolean;
  onToggle: (item: MenuItemAdminView) => void;
  onEdit: (item: MenuItemAdminView) => void;
  onDelete: (item: MenuItemAdminView) => void;
  isSuperAdmin: boolean;
}) {
  return (
    <CollapsibleCard title={title} defaultOpen={false}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-xs">
            <Input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Buscar plato..."
              className="pl-9"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> {newButtonLabel}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success">{disponibles} disponibles</Badge>
          <Badge variant="secondary">{items.length} totales</Badge>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nombre</th>
                {showCategory && (
                  <th className="px-4 py-3 font-medium">Categoría</th>
                )}
                <th className="px-4 py-3 text-right font-medium">Precio</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, i) => {
                const isAvailable = item.available;
                const zebra = i % 2 === 1 ? "bg-slate-900/40" : undefined;
                return (
                  <tr
                    key={item.id}
                    className={cn("border-b border-slate-800/60", zebra)}
                  >
                    <td className="px-4 py-2.5 font-medium">
                      {item.name}
                    </td>
                    {showCategory && (
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {MenuCategoryLabel[item.category]}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatPrice(item.price)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onToggle(item)}
                          className={
                            isAvailable
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                              : undefined
                          }
                        >
                          {isAvailable ? "Desactivar" : "Activar"}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Editar"
                          onClick={() => onEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isSuperAdmin && (
                          <Button
                            variant="destructive"
                            size="icon"
                            aria-label="Eliminar"
                            onClick={() => onDelete(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td
                    colSpan={showCategory ? 4 : 3}
                    className="px-4 py-6 text-center text-sm text-muted-foreground"
                  >
                    {items.length === 0
                      ? emptyText
                      : "No se encontraron platos con ese nombre"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </CollapsibleCard>
  );
}

export function MenuManager({
  currentUserRole,
  sizes,
  flavors,
  bobaTypes,
  toppings,
  drinkPrices,
  menuItems,
}: {
  currentUserRole: Role;
  sizes: Size[];
  flavors: Flavor[];
  bobaTypes: BobaType[];
  toppings: Topping[];
  drinkPrices: DrinkPrice[];
  menuItems: MenuItemAdminView[];
}) {
  const isSuperAdmin = currentUserRole === Role.SUPER_ADMIN;
  const [sizeForm, setSizeForm] = useState({ name: "", oz: "" });
  const [flavorForm, setFlavorForm] = useState<{
    name: string;
    categories: FlavorCategoryType[];
  }>({ name: "", categories: [] });
  const [bobaForm, setBobaForm] = useState<{
    name: string;
    kind: BobaKind;
  }>({ name: "", kind: BobaKind.TAPIOCA });
  const [toppingForm, setToppingForm] = useState({ name: "", price: "" });
  const [cartaModal, setCartaModal] = useState<{
    open: boolean;
    editing: MenuItemAdminView | null;
  }>({ open: false, editing: null });
  const [cartaDraft, setCartaDraft] = useState<{
    name: string;
    category: MenuCategoryType;
    price: string;
    description: string;
    options: { name: string; price: string }[];
  }>({
    name: "",
    category: MenuCategoryList[0],
    price: "",
    description: "",
    options: [],
  });
  const [cartaQuery, setCartaQuery] = useState("");
  const [bebidasQuery, setBebidasQuery] = useState("");
  const [cafeteriaQuery, setCafeteriaQuery] = useState("");
  const { toast } = useToast();

  const [editingSize, setEditingSize] = useState<Size | null>(null);
  const [sizeEdit, setSizeEdit] = useState({ name: "", oz: "" });
  const [editingFlavor, setEditingFlavor] = useState<Flavor | null>(null);
  const [flavorEdit, setFlavorEdit] = useState("");
  const [editingBoba, setEditingBoba] = useState<BobaType | null>(null);
  const [bobaEdit, setBobaEdit] = useState<{
    name: string;
    kind: BobaKind;
  }>({ name: "", kind: BobaKind.TAPIOCA });
  const [editingTopping, setEditingTopping] = useState<Topping | null>(null);
  const [toppingEdit, setToppingEdit] = useState({ name: "", price: "" });
  const [almuerzoModal, setAlmuerzoModal] = useState<{
    open: boolean;
    editing: MenuItemAdminView | null;
  }>({ open: false, editing: null });
  const [almuerzoDraft, setAlmuerzoDraft] = useState({
    name: "",
    price: "",
    description: "",
  });
  const [almuerzosQuery, setAlmuerzosQuery] = useState("");

  const almuerzos = menuItems
    .filter((i) => i.category === MenuCategory.ALMUERZO)
    .sort((a, b) => Number(b.available) - Number(a.available));
  const CARTA_CATEGORIES: MenuCategoryType[] = [
    MenuCategory.SANDWICH,
    MenuCategory.PANINI,
    MenuCategory.ENSALADA,
    MenuCategory.PIQUEO,
    MenuCategory.COMPARTIR,
    MenuCategory.ALITA,
    MenuCategory.HAMBURGUESA,
    MenuCategory.MILANESA,
    MenuCategory.LOMO,
    MenuCategory.POLLO,
    MenuCategory.KIDS,
  ];
  const CAFETERIA_CATEGORIES: MenuCategoryType[] = [
    MenuCategory.PANCAKE,
    MenuCategory.POSTRE,
    MenuCategory.WAFFLE,
    MenuCategory.EXTRAS,
  ];
  const cartaItems = menuItems
    .filter((i) => CARTA_CATEGORIES.includes(i.category))
    .sort((a, b) => Number(b.available) - Number(a.available));
  const bebidasItems = menuItems
    .filter((i) => i.category === MenuCategory.BEBIDA)
    .sort((a, b) => Number(b.available) - Number(a.available));
  const cafeteriaItems = menuItems
    .filter((i) => CAFETERIA_CATEGORIES.includes(i.category))
    .sort((a, b) => Number(b.available) - Number(a.available));
  const almuerzosDisponibles = almuerzos.filter((i) => i.available).length;
  const filteredAlmuerzos = almuerzosQuery
    ? almuerzos.filter((i) => normalize(i.name).includes(normalize(almuerzosQuery)))
    : almuerzos;
  const cartaDisponibles = cartaItems.filter((i) => i.available).length;
  const filteredCartaItems = cartaQuery
    ? cartaItems.filter(
        (i) =>
          normalize(i.name).includes(normalize(cartaQuery)) ||
          normalize(MenuCategoryLabel[i.category]).includes(normalize(cartaQuery)),
      )
    : cartaItems;
  const bebidasDisponibles = bebidasItems.filter((i) => i.available).length;
  const filteredBebidasItems = bebidasQuery
    ? bebidasItems.filter((i) =>
        normalize(i.name).includes(normalize(bebidasQuery)),
      )
    : bebidasItems;
  const cafeteriaDisponibles = cafeteriaItems.filter((i) => i.available).length;
  const filteredCafeteriaItems = cafeteriaQuery
    ? cafeteriaItems.filter(
        (i) =>
          normalize(i.name).includes(normalize(cafeteriaQuery)) ||
          normalize(MenuCategoryLabel[i.category]).includes(
            normalize(cafeteriaQuery),
          ),
      )
    : cafeteriaItems;

  function run(action: () => Promise<void>) {
    action().catch((e) => {
      toast({
        variant: "destructive",
        title: "AcciÃ³n Denegada",
        description: e instanceof Error ? e.message : "OcurriÃ³ un error.",
        duration: 100000,
      });
    });
  }

  function confirmDelete(action: () => Promise<void>) {
    if (
      window.confirm(
        "Â¿EstÃ¡s seguro de eliminar este elemento? Esta acciÃ³n no se puede deshacer.",
      )
    ) {
      run(action);
    }
  }

  function openNewAlmuerzo() {
    setAlmuerzoDraft({ name: "", price: "", description: "" });
    setAlmuerzoModal({ open: true, editing: null });
  }

  function openEditAlmuerzo(item: MenuItemAdminView) {
    setAlmuerzoDraft({
      name: item.name,
      price: String(item.price),
      description: item.description ?? "",
    });
    setAlmuerzoModal({ open: true, editing: item });
  }

  function saveAlmuerzo() {
    const name = almuerzoDraft.name.trim();
    const price = Number(almuerzoDraft.price);
    if (!name || !price || price <= 0) {
      toast({
        variant: "destructive",
        title: "Datos incompletos",
        description: "Nombre y precio son obligatorios.",
      });
      return;
    }
    const editing = almuerzoModal.editing;
    if (editing) {
      run(() =>
        updateMenuItem(editing.id, {
          name,
          category: MenuCategory.ALMUERZO,
          price: Math.trunc(price),
          available: editing.available,
          description: almuerzoDraft.description.trim() || null,
          options: [],
        }).then(() => setAlmuerzoModal({ open: false, editing: null })),
      );
    } else {
      run(() =>
        createMenuItem({
          name,
          category: MenuCategory.ALMUERZO,
          price: Math.trunc(price),
          description: almuerzoDraft.description.trim(),
          options: [],
        }).then(() => setAlmuerzoModal({ open: false, editing: null })),
      );
    }
  }

  function openNewCarta(category: MenuCategoryType = MenuCategoryList[0]) {
    setCartaDraft({
      name: "",
      category,
      price: "",
      description: "",
      options: [],
    });
    setCartaModal({ open: true, editing: null });
  }

  function openEditCarta(item: MenuItemAdminView) {
    setCartaDraft({
      name: item.name,
      category: item.category,
      price: String(item.price),
      description: item.description ?? "",
      options: item.options.map((o) => ({
        name: o.name,
        price: String(o.price),
      })),
    });
    setCartaModal({ open: true, editing: item });
  }

  function saveCarta() {
    const name = cartaDraft.name.trim();
    const price = Number(cartaDraft.price);
    if (!name || !price || price <= 0) {
      toast({
        variant: "destructive",
        title: "Datos incompletos",
        description: "Nombre y precio son obligatorios.",
      });
      return;
    }
    const editing = cartaModal.editing;
    const payload = {
      name,
      category: cartaDraft.category,
      price: Math.trunc(price),
      description: cartaDraft.description.trim() || null,
      options: cartaDraft.options
        .filter((o) => o.name.trim() && Number(o.price) > 0)
        .map((o) => ({ name: o.name.trim(), price: Math.trunc(Number(o.price)) })),
    };
    if (editing) {
      run(() =>
        updateMenuItem(editing.id, {
          ...payload,
          available: editing.available,
        }).then(() => setCartaModal({ open: false, editing: null })),
      );
    } else {
      run(() =>
        createMenuItem(payload).then(() =>
          setCartaModal({ open: false, editing: null }),
        ),
      );
    }
  }

  function toggleAvailable(item: MenuItemAdminView) {
    run(() =>
      updateMenuItem(item.id, {
        name: item.name,
        category: item.category,
        price: item.price,
        available: !item.available,
        description: item.description,
        options: item.options.map((o) => ({
          name: o.name,
          price: o.price,
        })),
      }),
    );
  }

  function openSizeEdit(size: Size) {
    setEditingSize(size);
    setSizeEdit({ name: size.name, oz: String(size.oz) });
  }

  function openFlavorEdit(flavor: Flavor) {
    setEditingFlavor(flavor);
    setFlavorEdit(flavor.name);
  }

  function openBobaEdit(boba: BobaType) {
    setEditingBoba(boba);
    setBobaEdit({ name: boba.name, kind: boba.kind });
  }

  function openToppingEdit(topping: Topping) {
    setEditingTopping(topping);
    setToppingEdit({ name: topping.name, price: String(topping.price) });
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white">GestiÃ³n del menÃº</h1>
<p className="text-muted-foreground">
          El menú se organiza en cinco secciones: Almuerzos, Platos a la carta,
          Bebidas, Cafetería y Bubas.
        </p>
      </div>

      <CollapsibleCard
        title="Almuerzos"
        defaultOpen={false}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-xs">
              <Input
                value={almuerzosQuery}
                onChange={(e) => setAlmuerzosQuery(e.target.value)}
                placeholder="Buscar plato..."
                className="pl-9"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <Button onClick={openNewAlmuerzo}>
              <Plus className="h-4 w-4" /> Nuevo Almuerzo
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="success">{almuerzosDisponibles} disponibles</Badge>
            <Badge variant="secondary">
              {almuerzos.length} totales
            </Badge>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 text-right font-medium">Precio</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlmuerzos.map((item, i) => {
                  const isAvailable = item.available;
                  const zebra = i % 2 === 1 ? "bg-slate-900/40" : undefined;
                  return (
                    <tr
                      key={item.id}
                      className={cn("border-b border-slate-800/60", zebra)}
                    >
                      <td className="px-4 py-2.5 font-medium">
                        {item.name}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatPrice(item.price)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              run(() =>
                                setMenuItemMenuDelDia(item.id, !isAvailable),
                              )
                            }
                            className={
                              isAvailable
                                ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                                : undefined
                            }
                          >
                            {isAvailable ? "Desactivar" : "Activar"}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Editar"
                            onClick={() => openEditAlmuerzo(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isSuperAdmin && (
                            <Button
                              variant="destructive"
                              size="icon"
                              aria-label="Eliminar"
                              onClick={() =>
                                confirmDelete(() => deleteMenuItem(item.id))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredAlmuerzos.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-center text-sm text-muted-foreground"
                    >
                      {almuerzos.length === 0
                        ? "No hay almuerzos registrados."
                        : "No se encontraron platos con ese nombre"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CollapsibleCard>

      <MenuSection
        title="Platos a la carta"
        items={cartaItems}
        filteredItems={filteredCartaItems}
        disponibles={cartaDisponibles}
        query={cartaQuery}
        onQueryChange={setCartaQuery}
        openNew={() => openNewCarta(MenuCategoryList[0])}
        newButtonLabel="Nuevo Plato"
        emptyText="No hay platos a la carta registrados."
        showCategory
        onToggle={toggleAvailable}
        onEdit={openEditCarta}
        onDelete={(item) => confirmDelete(() => deleteMenuItem(item.id))}
        isSuperAdmin={isSuperAdmin}
      />

      <MenuSection
        title="Bebidas"
        items={bebidasItems}
        filteredItems={filteredBebidasItems}
        disponibles={bebidasDisponibles}
        query={bebidasQuery}
        onQueryChange={setBebidasQuery}
        openNew={() => openNewCarta(MenuCategory.BEBIDA)}
        newButtonLabel="Nueva Bebida"
        emptyText="No hay bebidas registradas."
        showCategory={false}
        onToggle={toggleAvailable}
        onEdit={openEditCarta}
        onDelete={(item) => confirmDelete(() => deleteMenuItem(item.id))}
        isSuperAdmin={isSuperAdmin}
      />

      <MenuSection
        title="Cafetería"
        items={cafeteriaItems}
        filteredItems={filteredCafeteriaItems}
        disponibles={cafeteriaDisponibles}
        query={cafeteriaQuery}
        onQueryChange={setCafeteriaQuery}
        openNew={() => openNewCarta(MenuCategory.PANCAKE)}
        newButtonLabel="Nuevo Producto"
        emptyText="No hay productos de cafetería registrados."
        showCategory
        onToggle={toggleAvailable}
        onEdit={openEditCarta}
        onDelete={(item) => confirmDelete(() => deleteMenuItem(item.id))}
        isSuperAdmin={isSuperAdmin}
      />

      <CollapsibleCard title="Bubas" defaultOpen={false}>
        <div className="space-y-4">
          <SubSection title="TamaÃ±os de vaso">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Input
                  className="max-w-40"
                  placeholder="Nombre"
                  value={sizeForm.name}
                  onChange={(e) =>
                    setSizeForm({ ...sizeForm, name: e.target.value })
                  }
                />
                <Input
                  className="max-w-28"
                  type="number"
                  min="0"
                  placeholder="Onzas"
                  value={sizeForm.oz}
                  onChange={(e) =>
                    setSizeForm({ ...sizeForm, oz: e.target.value })
                  }
                />
                <Button
                  onClick={() =>
                    run(() =>
                      createSize({
                        name: sizeForm.name,
                        oz: Number(sizeForm.oz),
                      }),
                    )
                  }
                >
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </div>

              <div className="space-y-2">
                {sizes.map((size) => (
                  <div
                    key={size.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div>
                      <div className="font-medium">{size.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {size.oz} oz
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={size.available ? "success" : "secondary"}>
                        {size.available ? "Disponible" : "No disponible"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          run(() =>
                            updateSize(size.id, {
                              name: size.name,
                              oz: size.oz,
                              available: !size.available,
                            }),
                          )
                        }
                      >
                        {size.available ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Editar"
                        onClick={() => openSizeEdit(size)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        aria-label="Eliminar"
                        onClick={() => confirmDelete(() => deleteSize(size.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {sizes.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No hay tamaÃ±os registrados.
                  </p>
                )}
              </div>
            </div>
          </SubSection>

          <SubSection title="Sabores">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Input
                    className="max-w-44"
                    placeholder="Nombre"
                    value={flavorForm.name}
                    onChange={(e) =>
                      setFlavorForm({ ...flavorForm, name: e.target.value })
                    }
                  />
                  <Button
                    onClick={() =>
                      run(() =>
                        createFlavor({
                          name: flavorForm.name,
                          categories: flavorForm.categories,
                        }),
                      )
                    }
                  >
                    <Plus className="h-4 w-4" /> Agregar
                  </Button>
                </div>
                <CategoryToggles
                  selected={flavorForm.categories}
                  onChange={(categories) =>
                    setFlavorForm({ ...flavorForm, categories })
                  }
                />
              </div>

              <div className="space-y-2">
                {flavors.map((flavor) => (
                  <div
                    key={flavor.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{flavor.name}</span>
                      <CategoryToggles
                        selected={flavor.categories}
                        onChange={(categories) =>
                          run(() =>
                            updateFlavor(flavor.id, {
                              name: flavor.name,
                              categories,
                              available: flavor.available,
                            }),
                          )
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={flavor.available ? "success" : "secondary"}
                      >
                        {flavor.available ? "Disponible" : "No disponible"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          run(() =>
                            updateFlavor(flavor.id, {
                              name: flavor.name,
                              categories: flavor.categories,
                              available: !flavor.available,
                            }),
                          )
                        }
                      >
                        {flavor.available ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Editar"
                        onClick={() => openFlavorEdit(flavor)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        aria-label="Eliminar"
                        onClick={() =>
                          confirmDelete(() => deleteFlavor(flavor.id))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {flavors.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No hay sabores registrados.
                  </p>
                )}
              </div>
            </div>
          </SubSection>

          <SubSection title="Tipos de boba">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Input
                  className="max-w-48"
                  placeholder="Nombre"
                  value={bobaForm.name}
                  onChange={(e) =>
                    setBobaForm({ ...bobaForm, name: e.target.value })
                  }
                />
                <Select
                  value={bobaForm.kind}
                  onValueChange={(v) =>
                    setBobaForm({ ...bobaForm, kind: v as BobaKind })
                  }
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(BobaKind).map((k) => (
                      <SelectItem key={k} value={k}>
                        {BobaKindLabel[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() =>
                    run(() =>
                      createBoba({ name: bobaForm.name, kind: bobaForm.kind }),
                    )
                  }
                >
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </div>

              <div className="space-y-2">
                {bobaTypes.map((boba) => (
                  <div
                    key={boba.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div>
                      <div className="font-medium">{boba.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {BobaKindLabel[boba.kind]}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={boba.available ? "success" : "secondary"}>
                        {boba.available ? "Disponible" : "No disponible"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          run(() =>
                            updateBoba(boba.id, {
                              name: boba.name,
                              kind: boba.kind,
                              available: !boba.available,
                            }),
                          )
                        }
                      >
                        {boba.available ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Editar"
                        onClick={() => openBobaEdit(boba)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        aria-label="Eliminar"
                        onClick={() => confirmDelete(() => deleteBoba(boba.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {bobaTypes.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No hay tipos de boba registrados.
                  </p>
                )}
              </div>
            </div>
          </SubSection>

          <SubSection title="Toppings">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Input
                  className="max-w-48"
                  placeholder="Nombre"
                  value={toppingForm.name}
                  onChange={(e) =>
                    setToppingForm({ ...toppingForm, name: e.target.value })
                  }
                />
                <Input
                  className="max-w-28"
                  type="number"
                  min="0"
                  placeholder="Precio (Bs)"
                  value={toppingForm.price}
                  onChange={(e) =>
                    setToppingForm({ ...toppingForm, price: e.target.value })
                  }
                />
                <Button
                  onClick={() =>
                    run(() =>
                      createTopping({
                        name: toppingForm.name,
                        price: Number(toppingForm.price),
                      }),
                    )
                  }
                >
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </div>

              <div className="space-y-2">
                {toppings.map((topping) => (
                  <div
                    key={topping.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div>
                      <div className="font-medium">{topping.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatPrice(topping.price)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={topping.available ? "success" : "secondary"}
                      >
                        {topping.available ? "Disponible" : "No disponible"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          run(() =>
                            updateTopping(topping.id, {
                              name: topping.name,
                              price: topping.price,
                              available: !topping.available,
                            }),
                          )
                        }
                      >
                        {topping.available ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Editar"
                        onClick={() => openToppingEdit(topping)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        aria-label="Eliminar"
                        onClick={() =>
                          confirmDelete(() => deleteTopping(topping.id))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {toppings.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No hay toppings registrados.
                  </p>
                )}
              </div>
            </div>
          </SubSection>

          {FlavorCategoryList.map((category) => (
            <SubSection
              key={category}
              title={`Matriz de precios Â· ${FlavorCategoryLabel[category]}`}
            >
              <PriceMatrixEditor
                category={category}
                sizes={sizes}
                bobaTypes={bobaTypes}
                initialPrices={drinkPrices.filter((p) => p.category === category)}
              />
            </SubSection>
          ))}
        </div>
      </CollapsibleCard>

      <Dialog
        open={editingSize !== null}
        onOpenChange={(o) => {
          if (!o) setEditingSize(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar tamaÃ±o</DialogTitle>
            <DialogDescription>
              Actualiza el nombre y la medida del vaso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nombre"
              value={sizeEdit.name}
              onChange={(e) => setSizeEdit({ ...sizeEdit, name: e.target.value })}
            />
            <Input
              type="number"
              min="0"
              placeholder="Onzas"
              value={sizeEdit.oz}
              onChange={(e) => setSizeEdit({ ...sizeEdit, oz: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSize(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                editingSize &&
                run(() =>
                  updateSize(editingSize.id, {
                    name: sizeEdit.name,
                    oz: Number(sizeEdit.oz),
                    available: editingSize.available,
                  }).then(() => setEditingSize(null)),
                )
              }
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingFlavor !== null}
        onOpenChange={(o) => {
          if (!o) setEditingFlavor(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar sabor</DialogTitle>
            <DialogDescription>
              Actualiza el nombre del sabor.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Nombre"
            value={flavorEdit}
            onChange={(e) => setFlavorEdit(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFlavor(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                editingFlavor &&
                run(() =>
                  updateFlavor(editingFlavor.id, {
                    name: flavorEdit,
                    categories: editingFlavor.categories,
                    available: editingFlavor.available,
                  }).then(() => setEditingFlavor(null)),
                )
              }
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingBoba !== null}
        onOpenChange={(o) => {
          if (!o) setEditingBoba(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar tipo de boba</DialogTitle>
            <DialogDescription>
              Actualiza el nombre y el tipo de boba.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nombre"
              value={bobaEdit.name}
              onChange={(e) => setBobaEdit({ ...bobaEdit, name: e.target.value })}
            />
            <Select
              value={bobaEdit.kind}
              onValueChange={(v) =>
                setBobaEdit({ ...bobaEdit, kind: v as BobaKind })
              }
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(BobaKind).map((k) => (
                  <SelectItem key={k} value={k}>
                    {BobaKindLabel[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBoba(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                editingBoba &&
                run(() =>
                  updateBoba(editingBoba.id, {
                    name: bobaEdit.name,
                    kind: bobaEdit.kind,
                    available: editingBoba.available,
                  }).then(() => setEditingBoba(null)),
                )
              }
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingTopping !== null}
        onOpenChange={(o) => {
          if (!o) setEditingTopping(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar topping</DialogTitle>
            <DialogDescription>
              Actualiza el nombre y el precio del topping.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nombre"
              value={toppingEdit.name}
              onChange={(e) =>
                setToppingEdit({ ...toppingEdit, name: e.target.value })
              }
            />
            <Input
              type="number"
              min="0"
              placeholder="Precio (Bs)"
              value={toppingEdit.price}
              onChange={(e) =>
                setToppingEdit({ ...toppingEdit, price: e.target.value })
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTopping(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                editingTopping &&
                run(() =>
                  updateTopping(editingTopping.id, {
                    name: toppingEdit.name,
                    price: Number(toppingEdit.price),
                    available: editingTopping.available,
                  }).then(() => setEditingTopping(null)),
                )
              }
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={almuerzoModal.open}
        onOpenChange={(o) => {
          if (!o) setAlmuerzoModal({ open: false, editing: null });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {almuerzoModal.editing ? "Editar almuerzo" : "Nuevo almuerzo"}
            </DialogTitle>
            <DialogDescription>
              {almuerzoModal.editing
                ? "Actualiza la informaciÃ³n del plato."
                : "Registra un nuevo plato del MenÃº del DÃ­a."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Nombre
              </label>
              <Input
                placeholder="Nombre del almuerzo"
                value={almuerzoDraft.name}
                onChange={(e) =>
                  setAlmuerzoDraft({ ...almuerzoDraft, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Precio (Bs)
              </label>
              <Input
                type="number"
                min="1"
                placeholder="Precio"
                value={almuerzoDraft.price}
                onChange={(e) =>
                  setAlmuerzoDraft({ ...almuerzoDraft, price: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                DescripciÃ³n (opcional)
              </label>
              <Input
                placeholder="DescripciÃ³n"
                value={almuerzoDraft.description}
                onChange={(e) =>
                  setAlmuerzoDraft({
                    ...almuerzoDraft,
                    description: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAlmuerzoModal({ open: false, editing: null })}
            >
              Cancelar
            </Button>
            <Button onClick={saveAlmuerzo}>
              {almuerzoModal.editing ? "Guardar" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={cartaModal.open}
        onOpenChange={(o) => {
          if (!o) setCartaModal({ open: false, editing: null });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {cartaModal.editing ? "Editar producto" : "Nuevo producto"}
            </DialogTitle>
            <DialogDescription>
              {cartaModal.editing
                ? "Actualiza la información del producto del menú."
                : "Registra un nuevo producto del menú."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Nombre
              </label>
              <Input
                placeholder="Nombre del plato"
                value={cartaDraft.name}
                onChange={(e) =>
                  setCartaDraft({ ...cartaDraft, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                CategorÃ­a
              </label>
              <Select
                value={cartaDraft.category}
                onValueChange={(v) =>
                  setCartaDraft({
                    ...cartaDraft,
                    category: v as MenuCategoryType,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MenuCategoryList.map((c) => (
                    <SelectItem key={c} value={c}>
                      {MenuCategoryLabel[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Precio (Bs)
              </label>
              <Input
                type="number"
                min="1"
                placeholder="Precio"
                value={cartaDraft.price}
                onChange={(e) =>
                  setCartaDraft({ ...cartaDraft, price: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                DescripciÃ³n (opcional)
              </label>
              <Input
                placeholder="DescripciÃ³n"
                value={cartaDraft.description}
                onChange={(e) =>
                  setCartaDraft({
                    ...cartaDraft,
                    description: e.target.value,
                  })
                }
              />
            </div>
            <MenuItemOptionsEditor
              options={cartaDraft.options}
              onChange={(options) =>
                setCartaDraft({ ...cartaDraft, options })
              }
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCartaModal({ open: false, editing: null })}
            >
              Cancelar
            </Button>
            <Button onClick={saveCarta}>
              {cartaModal.editing ? "Guardar" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
