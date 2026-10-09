"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, ImageIcon, Pencil, Plus } from "lucide-react";
import {
  Badge,
  Button,
  CATEGORY_ICONS,
  CATEGORY_ICON_NAMES,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  useToast,
} from "@bbspos/ui";
import {
  createCategory,
  reorderCategories,
  setCategoryActive,
  updateCategory,
  type CategoryAdminView,
} from "@/app/actions/category";
import {
  removeCategoryImage,
  saveCategoryImage,
} from "@/app/actions/product-image";

interface CategoryFormState {
  key: string;
  name: string;
  slug: string;
  iconName: string;
  color: string;
  visibleInBar: boolean;
}

const DEFAULT_FORM: CategoryFormState = {
  key: "",
  name: "",
  slug: "",
  iconName: "UtensilsCrossed",
  color: "#CE7A22",
  visibleInBar: true,
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^(\d.*)$/, "categoria-$1");
}

function SortableCategory({
  item,
  onEdit,
  onToggleActive,
}: {
  item: CategoryAdminView;
  onEdit: (item: CategoryAdminView) => void;
  onToggleActive: (item: CategoryAdminView) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.key });
  const Icon = CATEGORY_ICONS[item.iconName];
  const previewSrc = item.imageUrl
    ? item.imageUrl.replace(/^\/images\/menu\//, "/api/menu-image/")
    : null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3",
        isDragging && "z-10 opacity-80",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-slate-500 hover:text-slate-300"
        aria-label={`Mover ${item.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {previewSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewSrc}
          alt=""
          aria-hidden
          className="h-10 w-16 shrink-0 rounded-md border border-slate-800 object-cover"
        />
      ) : (
        <span
          className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md border border-slate-800"
          style={{ color: item.color }}
        >
          {Icon && <Icon className="h-5 w-5" />}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold">{item.name}</span>
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {!item.visibleInBar && (
            <Badge variant="outline" title="No se muestra en la barra del POS">
              <EyeOff className="mr-1 h-3 w-3" /> Solo menú
            </Badge>
          )}
          {item.key === "ALMUERZO" && (
            <Badge variant="outline">Menú del Día</Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {item.key} · {item.slug}
        </p>
      </div>

      <CategoryImageField
        catKey={item.key}
        label={item.name}
        imageUrl={item.imageUrl}
      />

      <Button
        variant="outline"
        size="sm"
        aria-label={`Editar ${item.name}`}
        onClick={() => onEdit(item)}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <Button
        variant={item.isActive ? "outline" : "secondary"}
        size="sm"
        disabled={item.key === "ALMUERZO"}
        title={
          item.key === "ALMUERZO"
            ? "El Menú del Día no se desactiva"
            : item.isActive
              ? "Desactivar"
              : "Activar"
        }
        onClick={() => onToggleActive(item)}
      >
        {item.isActive ? "Desactivar" : "Activar"}
      </Button>
    </div>
  );
}

function CategoryImageField({
  catKey,
  label,
  imageUrl,
}: {
  catKey: string;
  label: string;
  imageUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      await saveCategoryImage({ key: catKey, file });
      toast({
        title: "Imagen guardada",
        description: `La imagen de "${label}" se optimizó y guardó.`,
      });
      router.refresh();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "No se pudo guardar la imagen",
        description: e instanceof Error ? e.message : "Ocurrió un error.",
        duration: 100000,
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      await removeCategoryImage({ key: catKey });
      toast({ title: "Imagen eliminada" });
      router.refresh();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "No se pudo quitar la imagen",
        description: e instanceof Error ? e.message : "Ocurrió un error.",
        duration: 100000,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        title="Subir o cambiar la imagen de fondo de la tarjeta"
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          "Procesando..."
        ) : imageUrl ? (
          <ImageIcon className="h-4 w-4" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </Button>
      {imageUrl && (
        <Button
          variant="destructive"
          size="sm"
          disabled={busy}
          title="Quitar la imagen"
          onClick={handleRemove}
        >
          Quitar
        </Button>
      )}
    </div>
  );
}

export function CategoriesPanel({
  categories,
}: {
  categories: CategoryAdminView[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState(categories);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    open: boolean;
    editing: CategoryAdminView | null;
  }>({ open: false, editing: null });
  const [draft, setDraft] = useState<CategoryFormState>(DEFAULT_FORM);
  const [busy, setBusy] = useState(false);
  const committedRef = useRef(categories);

  useEffect(() => {
    setItems(categories);
  }, [categories]);

  const activeItem = useMemo(
    () => items.find((i) => i.key === activeKey) ?? null,
    [items, activeKey],
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: { active: { id: unknown } }) {
    setActiveKey(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveKey(null);
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.key === active.id);
    const newIndex = items.findIndex((i) => i.key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(items, oldIndex, newIndex);
    committedRef.current = next;
    setItems(next);
    run(() => reorderCategories(next.map((i) => i.key)));
  }

  function handleDragCancel() {
    setActiveKey(null);
  }

  function run(action: () => Promise<void>) {
    return action().catch((e) => {
      toast({
        variant: "destructive",
        title: "No se pudo guardar",
        description: e instanceof Error ? e.message : "Ocurrió un error.",
        duration: 100000,
      });
      setItems(committedRef.current);
    });
  }

  function openCreate() {
    setDraft(DEFAULT_FORM);
    setModal({ open: true, editing: null });
  }

  function openEdit(category: CategoryAdminView) {
    setDraft({
      key: category.key,
      name: category.name,
      slug: category.slug,
      iconName: category.iconName,
      color: category.color,
      visibleInBar: category.visibleInBar,
    });
    setModal({ open: true, editing: category });
  }

  function toggleActive(category: CategoryAdminView) {
    const nextActive = !category.isActive;
    run(() =>
      setCategoryActive({ key: category.key, isActive: nextActive }).then(() => {
        setItems((prev) =>
          prev.map((i) =>
            i.key === category.key ? { ...i, isActive: nextActive } : i,
          ),
        );
        router.refresh();
      }),
    );
  }

  function saveCategory() {
    const name = draft.name.trim();
    if (!name) {
      toast({
        variant: "destructive",
        title: "Datos incompletos",
        description: "El nombre es obligatorio.",
      });
      return;
    }
    setBusy(true);
    const editing = modal.editing;
    const payload = { ...draft, name };
    if (editing) {
      run(() =>
        updateCategory(payload).then(() => {
          toast({ title: "Categoría actualizada" });
          setModal({ open: false, editing: null });
          router.refresh();
        }),
      ).finally(() => setBusy(false));
    } else {
      run(() =>
        createCategory(payload).then(() => {
          toast({ title: "Categoría creada" });
          setModal({ open: false, editing: null });
          router.refresh();
        }),
      ).finally(() => setBusy(false));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Arrastrá para ordenar la barra del POS. Al quitar la imagen, la tarjeta
          se dibuja con su ícono y color. Las categorías desactivadas no se
          ofrecen en las terminales.
        </p>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Nueva categoría
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={items.map((i) => i.key)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {items.map((item) => (
              <SortableCategory
                key={item.key}
                item={item}
                onEdit={openEdit}
                onToggleActive={toggleActive}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeItem && (
            <div className="flex items-center gap-3 rounded-lg border border-slate-600 bg-slate-900/90 p-3 shadow-lg">
              <GripVertical className="h-5 w-5 text-slate-400" />
              <span className="text-sm font-semibold">{activeItem.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <Dialog
        open={modal.open}
        onOpenChange={(o) => {
          if (!o) setModal({ open: false, editing: null });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modal.editing ? `Editar "${modal.editing.name}"` : "Nueva categoría"}
            </DialogTitle>
            <DialogDescription>
              La clave identifica la categoría en la base (se guarda en cada
              plato). El slug es la parte legible de la URL.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Clave</Label>
              <Input
                disabled={modal.editing !== null}
                placeholder="ej. PIZZA"
                value={draft.key}
                onChange={(e) =>
                  setDraft({ ...draft, key: e.target.value.toUpperCase() })
                }
              />
              {modal.editing && (
                <p className="text-xs text-muted-foreground">
                  La clave se define al crear la categoría.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                placeholder="ej. Pizzas"
                value={draft.name}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    name: e.target.value,
                    slug:
                      modal.editing === null && !draft.slug
                        ? slugify(e.target.value)
                        : draft.slug,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                placeholder="ej. pizzas"
                value={draft.slug}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    slug: slugify(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Ícono de la barra</Label>
              <div className="grid grid-cols-6 gap-2">
                {CATEGORY_ICON_NAMES.map((name) => {
                  const Icon = CATEGORY_ICONS[name];
                  return (
                    <button
                      key={name}
                      type="button"
                      title={name}
                      onClick={() => setDraft({ ...draft, iconName: name })}
                      className={cn(
                        "flex h-9 items-center justify-center rounded-lg border border-slate-800 hover:border-slate-500",
                        draft.iconName === name &&
                          "border-amber-500 bg-amber-500/10",
                      )}
                    >
                      {Icon && <Icon className="h-5 w-5" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label>Color de acento</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draft.color}
                    onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                    className="h-9 w-12 cursor-pointer rounded border border-slate-800 bg-transparent"
                  />
                  <Input
                    className="w-28 font-mono"
                    value={draft.color}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        color: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.visibleInBar}
                  onChange={(e) =>
                    setDraft({ ...draft, visibleInBar: e.target.checked })
                  }
                  className="h-4 w-4 accent-amber-500"
                />
                <Eye className="h-4 w-4 text-muted-foreground" />
                Mostrar en la barra del POS
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModal({ open: false, editing: null })}
            >
              Cancelar
            </Button>
            <Button disabled={busy} onClick={saveCategory}>
              {modal.editing ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}