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

type MenuItemFormState = {
  name: string;
  category: MenuCategoryType;
  price: string;
  description: string;
  options: { name: string; price: string }[];
};

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
        title: "Acción Denegada",
        description: e instanceof Error ? e.message : "Ocurrió un error.",
        duration: 100000,
      });
    }
  }

  return (
    <div className="space-y-4">
      {sizes.length === 0 || bobaTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Registra al menos un tamaño y un tipo de boba para cargar la matriz.
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
                    {s.name} · {s.oz} oz
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
        Variantes (Pollo / Res, etc.) — precio propio por variante
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
            ✕
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

function PlatosGroup({
  title,
  subtitle,
  emptyText,
  defaultOpen,
  form,
  setForm,
  onAdd,
  categoryOptions,
  items,
  showDelDia,
  onToggleDelDia,
  onToggleAvailable,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle?: string;
  emptyText: string;
  defaultOpen: boolean;
  form: MenuItemFormState;
  setForm: (next: MenuItemFormState) => void;
  onAdd: () => void;
  categoryOptions?: readonly MenuCategoryType[];
  items: MenuItemAdminView[];
  showDelDia?: boolean;
  onToggleDelDia?: (item: MenuItemAdminView) => void;
  onToggleAvailable: (item: MenuItemAdminView) => void;
  onEdit: (item: MenuItemAdminView) => void;
  onDelete: (item: MenuItemAdminView) => void;
}) {
  return (
    <CollapsibleCard title={title} defaultOpen={defaultOpen}>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 items-end">
            <Input
              className="max-w-52"
              placeholder="Nombre del plato"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {categoryOptions && (
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm({ ...form, category: v as MenuCategoryType })
                }
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {MenuCategoryLabel[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Input
              className="max-w-28"
              type="number"
              min="1"
              placeholder="Precio (Bs)"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <Button onClick={onAdd}>
              <Plus className="h-4 w-4" /> Agregar plato
            </Button>
          </div>
          <Input
            placeholder="Descripción (opcional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <MenuItemOptionsEditor
            options={form.options}
            onChange={(options) => setForm({ ...form, options })}
          />
        </div>

        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}

        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{item.name}</span>
                <Badge variant={item.available ? "success" : "secondary"}>
                  {item.available ? "Disponible" : "No disponible"}
                </Badge>
                {item.category === MenuCategory.ALMUERZO &&
                  item.enMenuDelDiaHoy && (
                    <Badge variant="warning">DEL DÍA</Badge>
                  )}
                {categoryOptions && (
                  <span className="text-sm text-muted-foreground">
                    {MenuCategoryLabel[item.category]}
                  </span>
                )}
                {item.options.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Variante:{" "}
                    {item.options
                      .map((o) => `${o.name} ${formatPrice(o.price)}`)
                      .join(" · ")}
                  </span>
                )}
                <span className="text-sm text-muted-foreground">
                  {formatPrice(item.price)}
                </span>
                {item.description && (
                  <p className="w-full text-xs text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {showDelDia && onToggleDelDia && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!item.available}
                    title={
                      item.available
                        ? "Agregar o quitar del Menú del Día de hoy"
                        : "El plato debe estar disponible"
                    }
                    onClick={() => onToggleDelDia(item)}
                    className={
                      item.enMenuDelDiaHoy
                        ? "border-amber-500 bg-amber-500/10 text-amber-500"
                        : undefined
                    }
                  >
                    {item.enMenuDelDiaHoy ? "Quitar del día" : "Agregar al día"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleAvailable(item)}
                >
                  {item.available ? "Desactivar" : "Activar"}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Editar"
                  onClick={() => onEdit(item)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  aria-label="Eliminar"
                  onClick={() => onDelete(item)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">{emptyText}</p>
          )}
        </div>
      </div>
    </CollapsibleCard>
  );
}

export function MenuManager({
  sizes,
  flavors,
  bobaTypes,
  toppings,
  drinkPrices,
  menuItems,
}: {
  sizes: Size[];
  flavors: Flavor[];
  bobaTypes: BobaType[];
  toppings: Topping[];
  drinkPrices: DrinkPrice[];
  menuItems: MenuItemAdminView[];
}) {
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
  const [almuerzoForm, setAlmuerzoForm] = useState<MenuItemFormState>({
    name: "",
    category: MenuCategory.ALMUERZO,
    price: "",
    description: "",
    options: [],
  });
  const [cartaForm, setCartaForm] = useState<MenuItemFormState>({
    name: "",
    category: MenuCategoryList[0],
    price: "",
    description: "",
    options: [],
  });
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
  const [editingMenuItem, setEditingMenuItem] =
    useState<MenuItemAdminView | null>(null);
  const [menuItemEdit, setMenuItemEdit] = useState<MenuItemFormState>({
    name: "",
    category: MenuCategory.ALMUERZO,
    price: "",
    description: "",
    options: [],
  });

  const almuerzos = menuItems.filter(
    (i) => i.category === MenuCategory.ALMUERZO,
  );
  const cartaItems = menuItems.filter(
    (i) => i.category !== MenuCategory.ALMUERZO,
  );

  function run(action: () => Promise<void>) {
    action().catch((e) => {
      toast({
        variant: "destructive",
        title: "Acción Denegada",
        description: e instanceof Error ? e.message : "Ocurrió un error.",
        duration: 100000,
      });
    });
  }

  function confirmDelete(action: () => Promise<void>) {
    if (
      window.confirm(
        "¿Estás seguro de eliminar este elemento? Esta acción no se puede deshacer.",
      )
    ) {
      run(action);
    }
  }

  function addMenuItem(form: MenuItemFormState) {
    run(() =>
      createMenuItem({
        name: form.name,
        category: form.category,
        price: Number(form.price),
        description: form.description,
        options: form.options.map((o) => ({
          name: o.name,
          price: Number(o.price),
        })),
      }),
    );
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

  function openMenuItemEdit(item: MenuItemAdminView) {
    setEditingMenuItem(item);
    setMenuItemEdit({
      name: item.name,
      category: item.category,
      price: String(item.price),
      description: item.description ?? "",
      options: item.options.map((o) => ({
        name: o.name,
        price: String(o.price),
      })),
    });
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-white">Gestión del menú</h1>
        <p className="text-muted-foreground">
          El menú se organiza en tres secciones: Almuerzos, Platos a la carta y
          Bubas.
        </p>
      </div>

      <PlatosGroup
        title="Almuerzos"
        subtitle="Platos del Menú del Día (sección dinámica por jornada)."
        emptyText="No hay almuerzos registrados."
        defaultOpen={almuerzos.length > 0}
        form={almuerzoForm}
        setForm={setAlmuerzoForm}
        onAdd={() => addMenuItem(almuerzoForm)}
        items={almuerzos}
        showDelDia
        onToggleDelDia={(item) =>
          run(() => setMenuItemMenuDelDia(item.id, !item.enMenuDelDiaHoy))
        }
        onToggleAvailable={toggleAvailable}
        onEdit={openMenuItemEdit}
        onDelete={(item) => confirmDelete(() => deleteMenuItem(item.id))}
      />

      <PlatosGroup
        title="Platos a la carta"
        subtitle="Categorías fijas de la carta (todas las que no son almuerzo)."
        emptyText="No hay platos a la carta registrados."
        defaultOpen={cartaItems.length > 0}
        form={cartaForm}
        setForm={setCartaForm}
        onAdd={() => addMenuItem(cartaForm)}
        categoryOptions={MenuCategoryList}
        items={cartaItems}
        onToggleAvailable={toggleAvailable}
        onEdit={openMenuItemEdit}
        onDelete={(item) => confirmDelete(() => deleteMenuItem(item.id))}
      />

      <CollapsibleCard title="Bubas" defaultOpen>
        <div className="space-y-4">
          <SubSection title="Tamaños de vaso">
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
                    No hay tamaños registrados.
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
              title={`Matriz de precios · ${FlavorCategoryLabel[category]}`}
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
            <DialogTitle>Editar tamaño</DialogTitle>
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
        open={editingMenuItem !== null}
        onOpenChange={(o) => {
          if (!o) setEditingMenuItem(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar plato</DialogTitle>
            <DialogDescription>
              Actualiza la información del plato: nombre, sección, precio fijo,
              descripción y variantes de precio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nombre"
              value={menuItemEdit.name}
              onChange={(e) =>
                setMenuItemEdit({ ...menuItemEdit, name: e.target.value })
              }
            />
            <Select
              value={menuItemEdit.category}
              onValueChange={(v) =>
                setMenuItemEdit({
                  ...menuItemEdit,
                  category: v as MenuCategoryType,
                })
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[MenuCategory.ALMUERZO, ...MenuCategoryList].map((c) => (
                  <SelectItem key={c} value={c}>
                    {MenuCategoryLabel[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="1"
              placeholder="Precio (Bs)"
              value={menuItemEdit.price}
              onChange={(e) =>
                setMenuItemEdit({ ...menuItemEdit, price: e.target.value })
              }
            />
            <Input
              placeholder="Descripción (opcional)"
              value={menuItemEdit.description}
              onChange={(e) =>
                setMenuItemEdit({
                  ...menuItemEdit,
                  description: e.target.value,
                })
              }
            />
            <MenuItemOptionsEditor
              options={menuItemEdit.options}
              onChange={(options) =>
                setMenuItemEdit({ ...menuItemEdit, options })
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMenuItem(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                editingMenuItem &&
                run(() =>
                  updateMenuItem(editingMenuItem.id, {
                    name: menuItemEdit.name,
                    category: menuItemEdit.category,
                    price: Number(menuItemEdit.price),
                    available: editingMenuItem.available,
                    description: menuItemEdit.description,
                    options: menuItemEdit.options.map((o) => ({
                      name: o.name,
                      price: Number(o.price),
                    })),
                  }).then(() => setEditingMenuItem(null)),
                )
              }
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}