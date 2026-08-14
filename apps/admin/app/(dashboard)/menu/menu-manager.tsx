"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  FlavorCategory,
  FlavorCategoryLabel,
  formatPrice,
  type BobaType,
  type Flavor,
  type Size,
} from "@bubba/types";
import {
  createBoba,
  createFlavor,
  createSize,
  deleteBoba,
  deleteFlavor,
  deleteSize,
  updateBoba,
  updateFlavor,
  updateSize,
} from "@/app/actions/catalog";

function PriceInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Input
      type="number"
      min="0"
      step="0.01"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Precio ($)"}
    />
  );
}

export function MenuManager({
  sizes,
  flavors,
  bobaTypes,
}: {
  sizes: Size[];
  flavors: Flavor[];
  bobaTypes: BobaType[];
}) {
  const [sizeForm, setSizeForm] = useState({ name: "", ml: "", price: "" });
  const [flavorForm, setFlavorForm] = useState<{
    name: string;
    category: FlavorCategory;
    price: string;
  }>({
    name: "",
    category: FlavorCategory.MILK,
    price: "",
  });
  const [bobaForm, setBobaForm] = useState<{
    name: string;
    kind: BobaKind;
    price: string;
  }>({
    name: "",
    kind: BobaKind.TAPIOCA,
    price: "",
  });
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<void>) {
    setError(null);
    action().catch((e) => {
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestión del menú</h1>
        <p className="text-muted-foreground">
          Administra tamaños, sabores y tipos de boba.
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
              placeholder="ml"
              value={sizeForm.ml}
              onChange={(e) => setSizeForm({ ...sizeForm, ml: e.target.value })}
            />
            <PriceInput
              value={sizeForm.price}
              onChange={(v) => setSizeForm({ ...sizeForm, price: v })}
            />
            <Button
              onClick={() =>
                run(() =>
                  createSize({
                    name: sizeForm.name,
                    ml: Number(sizeForm.ml),
                    price: Math.round(Number(sizeForm.price) * 100),
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
                    {size.ml} ml · {formatPrice(size.price)}
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
                          ml: size.ml,
                          price: size.price,
                          available: !size.available,
                        }),
                      )
                    }
                  >
                    {size.available ? "Desactivar" : "Activar"}
                  </Button>
                  <Button
                    variant="ghost"
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
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-44"
              placeholder="Nombre"
              value={flavorForm.name}
              onChange={(e) =>
                setFlavorForm({ ...flavorForm, name: e.target.value })
              }
            />
            <Select
              value={flavorForm.category}
              onValueChange={(v) =>
                setFlavorForm({ ...flavorForm, category: v as Flavor["category"] })
              }
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(FlavorCategory).map((c) => (
                  <SelectItem key={c} value={c}>
                    {FlavorCategoryLabel[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PriceInput
              value={flavorForm.price}
              onChange={(v) => setFlavorForm({ ...flavorForm, price: v })}
            />
            <Button
              onClick={() =>
                run(() =>
                  createFlavor({
                    name: flavorForm.name,
                    category: flavorForm.category,
                    price: Math.round(Number(flavorForm.price) * 100),
                  }),
                )
              }
            >
              <Plus className="h-4 w-4" /> Agregar
            </Button>
          </div>

          <div className="space-y-2">
            {flavors.map((flavor) => (
              <div
                key={flavor.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <div className="font-medium">{flavor.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {FlavorCategoryLabel[flavor.category]} ·{" "}
                    {formatPrice(flavor.price)}
                  </div>
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
                          category: flavor.category,
                          price: flavor.price,
                          available: !flavor.available,
                        }),
                      )
                    }
                  >
                    {flavor.available ? "Desactivar" : "Activar"}
                  </Button>
                  <Button
                    variant="ghost"
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
                setBobaForm({ ...bobaForm, kind: v as BobaType["kind"] })
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
            <PriceInput
              value={bobaForm.price}
              onChange={(v) => setBobaForm({ ...bobaForm, price: v })}
            />
            <Button
              onClick={() =>
                run(() =>
                  createBoba({
                    name: bobaForm.name,
                    kind: bobaForm.kind,
                    price: Math.round(Number(bobaForm.price) * 100),
                  }),
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
                    {BobaKindLabel[boba.kind]} · {formatPrice(boba.price)}
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
                          price: boba.price,
                          available: !boba.available,
                        }),
                      )
                    }
                  >
                    {boba.available ? "Desactivar" : "Activar"}
                  </Button>
                  <Button
                    variant="ghost"
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
    </div>
  );
}
