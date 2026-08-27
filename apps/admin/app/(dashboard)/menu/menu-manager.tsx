"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
} from "@bubba/ui";
import {
  BobaKind,
  BobaKindLabel,
  FlavorCategoryLabel,
  FlavorCategoryList,
  formatPrice,
  type BobaType,
  type DrinkPrice,
  type Flavor,
  type FlavorCategory as FlavorCategoryType,
  type Size,
  type Topping,
} from "@bubba/types";
import {
  createBoba,
  createFlavor,
  createSize,
  createTopping,
  deleteBoba,
  deleteFlavor,
  deleteSize,
  deleteTopping,
  saveDrinkPrices,
  updateBoba,
  updateFlavor,
  updateSize,
  updateTopping,
} from "@/app/actions/catalog";

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
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
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
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Matriz de precios · {FlavorCategoryLabel[category]}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button
            onClick={save}
            disabled={sizes.length === 0 || bobaTypes.length === 0}
          >
            Guardar matriz
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function MenuManager({
  sizes,
  flavors,
  bobaTypes,
  toppings,
  drinkPrices,
}: {
  sizes: Size[];
  flavors: Flavor[];
  bobaTypes: BobaType[];
  toppings: Topping[];
  drinkPrices: DrinkPrice[];
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
  const [error, setError] = useState<string | null>(null);

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

  function run(action: () => Promise<void>) {
    setError(null);
    action().catch((e) => {
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
    });
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
      <div>
        <h1 className="text-2xl font-bold">Gestión del menú</h1>
        <p className="text-muted-foreground">
          Administra tamaños, sabores, bobas, toppings y la matriz de precios.
        </p>
      </div>

      {error && (
        <Card>
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tamaños de vaso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
              onChange={(e) => setSizeForm({ ...sizeForm, oz: e.target.value })}
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
                  <div className="text-sm text-muted-foreground">{size.oz} oz</div>
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
                    onClick={() => run(() => deleteSize(size.id))}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sabores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                  <Badge variant={flavor.available ? "success" : "secondary"}>
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
                    onClick={() => run(() => deleteFlavor(flavor.id))}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipos de boba</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                    onClick={() => run(() => deleteBoba(boba.id))}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Toppings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                  <Badge variant={topping.available ? "success" : "secondary"}>
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
                    onClick={() => run(() => deleteTopping(topping.id))}
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
        </CardContent>
      </Card>

      {FlavorCategoryList.map((category) => (
        <PriceMatrixEditor
          key={category}
          category={category}
          sizes={sizes}
          bobaTypes={bobaTypes}
          initialPrices={drinkPrices.filter((p) => p.category === category)}
        />
      ))}

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
            <Button
              variant="outline"
              onClick={() => setEditingSize(null)}
            >
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
            <Button
              variant="outline"
              onClick={() => setEditingFlavor(null)}
            >
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
            <Button
              variant="outline"
              onClick={() => setEditingBoba(null)}
            >
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
            <Button
              variant="outline"
              onClick={() => setEditingTopping(null)}
            >
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
    </div>
  );
}
