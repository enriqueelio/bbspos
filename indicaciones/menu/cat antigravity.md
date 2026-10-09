# SOLUCIÓN COMPLETA: GESTOR DE CATEGORÍAS (ADMIN Y MENÚ/POS)

> **Documento de especificación e implementación directa para OpenCode.**
> **Stack:** Next.js (App Router), Prisma ORM (SQLite / PostgreSQL), Tailwind CSS, `@dnd-kit`, `lucide-react`.

---

## 1. Schema de Base de Datos (Prisma)

Se reemplaza el enum hardcodeado `MenuCategory` y se unifica el antiguo `CategoryConfig` en un único modelo `Category` flexible y dinámico.

```prisma
// packages/db/prisma/schema.prisma

model Category {
  id        String   @id @default(cuid())
  name      String                             // Nombre visible (ej: "Hamburguesas Artesanales")
  slug      String   @unique                   // Identificador URL/key (ej: "hamburguesas", "sandwich")
  icon      String?  @default("Utensils")      // Nombre del icono de Lucide (ej: "Flame", "Pizza", "Beer")
  image     String?                            // URL de imagen (ej: "/images/menu/category-hamburguesa.webp")
  color     String?  @default("#f97316")       // Color temático en HEX o clase (ej: "#f97316")
  order     Int      @default(0)               // Posición para Drag & Drop
  isActive  Boolean  @default(true)            // Activa/Inactiva en el menú
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  items     MenuItem[]

  @@index([order])
  @@index([isActive])
}

// Modificación en MenuItem para relacionar o referenciar la categoría:
// model MenuItem {
//   ...
//   categoryId String?
//   category   Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
//   // Para retrocompatibilidad durante migración, se puede mantener categorySlug String?
//   @@index([categoryId, available])
// }
```

---

## 2. Endpoints de API (Next.js App Router)

### A) `apps/admin/app/api/admin/categories/route.ts`
Maneja listado (`GET`) y creación (`POST`).

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Ajustar al import real de prisma del monorepo

// GET /api/admin/categories
// Devuelve todas las categorías ordenadas por 'order' ascendente
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const onlyActive = searchParams.get("active") === "true";

    const categories = await prisma.category.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    console.error("Error al obtener categorías:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener categorías" },
      { status: 500 }
    );
  }
}

// POST /api/admin/categories
// Crea una nueva categoría asignándole el último orden disponible
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug, icon, image, color, isActive } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: "Nombre y slug son obligatorios" },
        { status: 400 }
      );
    }

    // Comprobar colisión de slug
    const existing = await prisma.category.findUnique({
      where: { slug: slug.trim().toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Ya existe una categoría con este slug" },
        { status: 400 }
      );
    }

    // Obtener el mayor order actual
    const lastCategory = await prisma.category.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const nextOrder = (lastCategory?.order ?? -1) + 1;

    const newCategory = await prisma.category.create({
      data: {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        icon: icon || "Utensils",
        image: image || null,
        color: color || "#f97316",
        order: nextOrder,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json({ success: true, data: newCategory }, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear categoría:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear categoría" },
      { status: 500 }
    );
  }
}
```

---

### B) `apps/admin/app/api/admin/categories/[id]/route.ts`
Maneja edición individual (`PATCH` / `PUT`) y borrado suave o duro (`DELETE`).

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { name, slug, icon, image, color, isActive } = body;

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(slug && { slug: slug.trim().toLowerCase() }),
        ...(icon !== undefined && { icon }),
        ...(image !== undefined && { image }),
        ...(color !== undefined && { color }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error al actualizar categoría:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar categoría" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Se puede validar si tiene items asociados
    const countItems = await prisma.menuItem.count({
      where: { categoryId: id },
    });

    if (countItems > 0) {
      // Soft-delete recomendado para no quebrar órdenes históricas
      const deactivated = await prisma.category.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        success: true,
        message: "Categoría desactivada porque contiene productos asociados",
        data: deactivated,
      });
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Categoría eliminada" });
  } catch (error: any) {
    console.error("Error al eliminar categoría:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar categoría" },
      { status: 500 }
    );
  }
}
```

---

### C) `apps/admin/app/api/admin/categories/reorder/route.ts`
Reordena todas las categorías en una sola transacción atómica en la base de datos.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/admin/categories/reorder
// Body: { items: [{ id: "cuid-1", order: 0 }, { id: "cuid-2", order: 1 }, ...] }
//   o  { orderedIds: ["cuid-1", "cuid-2", ...] }
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderedIds, items } = body;

    let updates: { id: string; order: number }[] = [];

    if (Array.isArray(orderedIds)) {
      updates = orderedIds.map((id: string, index: number) => ({
        id,
        order: index,
      }));
    } else if (Array.isArray(items)) {
      updates = items;
    } else {
      return NextResponse.json(
        { success: false, error: "Formato inválido. Envíe 'orderedIds' o 'items'." },
        { status: 400 }
      );
    }

    // Ejecución atómica en transacción
    await prisma.$transaction(
      updates.map((item) =>
        prisma.category.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: "Orden actualizado correctamente",
    });
  } catch (error: any) {
    console.error("Error al reordenar categorías:", error);
    return NextResponse.json(
      { success: false, error: "Error al guardar el nuevo orden" },
      { status: 500 }
    );
  }
}
```

---

### D) `apps/admin/app/api/admin/categories/upload/route.ts` (Subida de Imagen)
Endpoint para procesar y optimizar la imagen con Sharp a WebP.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const slug = (formData.get("slug") as string) || "category";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No se envió archivo" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Optimización WebP 640x360 cover (formato estándar del POS)
    const optimizedBuffer = await sharp(buffer)
      .resize(640, 360, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer();

    const fileName = `category-${slug.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}.webp`;
    const uploadDir = path.join(process.cwd(), "public/uploads/categories");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), optimizedBuffer);

    const imageUrl = `/uploads/categories/${fileName}`;

    return NextResponse.json({ success: true, imageUrl });
  } catch (error: any) {
    console.error("Error al subir imagen:", error);
    return NextResponse.json(
      { success: false, error: "Error procesando imagen" },
      { status: 500 }
    );
  }
}
```

---

## 3. Componente AdminCategoryManager.tsx

Ubicación: `apps/admin/components/categories/AdminCategoryManager.tsx`  
Página contenedora: `apps/admin/app/(dashboard)/admin/categorias/page.tsx`

> **Dependencias requeridas:**
> `pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities lucide-react`

```tsx
"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import * as Icons from "lucide-react";
import {
  GripVertical,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Check,
  X,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  image: string | null;
  color: string | null;
  order: number;
  isActive: boolean;
  _count?: { items: number };
}

// Icon helper seguro
const DynamicIcon = ({ name, className, style }: { name: string | null; className?: string; style?: React.CSSProperties }) => {
  if (!name) return <Icons.Utensils className={className} style={style} />;
  const IconComponent = (Icons as Record<string, any>)[name] || Icons.Utensils;
  return <IconComponent className={className} style={style} />;
};

const AVAILABLE_ICONS = [
  "Utensils", "UtensilsCrossed", "Flame", "Pizza", "Coffee", "Beer", 
  "Wine", "CupSoda", "IceCream", "Cake", "Sandwich", "Fish", 
  "Beef", "Salad", "Cookie", "Apple", "Soup", "Sparkles"
];

// Fila Arrastrable (Sortable Row)
function SortableCategoryRow({
  category,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  category: Category;
  onEdit: (c: Category) => void;
  onToggleActive: (c: Category) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-slate-700/60 transition-colors ${
        isDragging ? "bg-slate-800 shadow-xl opacity-90" : "hover:bg-slate-800/40"
      }`}
    >
      {/* Handle Drag */}
      <td className="w-10 px-3 py-3 text-center">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700/60"
        >
          <GripVertical className="w-5 h-5" />
        </button>
      </td>

      {/* Orden */}
      <td className="w-14 px-3 py-3 text-sm text-center font-mono text-slate-400">
        #{category.order + 1}
      </td>

      {/* Imagen */}
      <td className="w-20 px-3 py-3">
        <div className="w-14 h-10 rounded-md overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center relative">
          {category.image ? (
            <img
              src={category.image}
              alt={category.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon className="w-5 h-5 text-slate-500" />
          )}
        </div>
      </td>

      {/* Nombre y Slug */}
      <td className="px-4 py-3">
        <div className="font-semibold text-slate-100 flex items-center gap-2">
          <span>{category.name}</span>
          {!category.isActive && (
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800/50">
              Inactiva
            </span>
          )}
        </div>
        <div className="text-xs font-mono text-slate-400">/{category.slug}</div>
      </td>

      {/* Icono + Color */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm"
            style={{
              backgroundColor: `${category.color || "#f97316"}20`,
              borderColor: `${category.color || "#f97316"}60`,
              color: category.color || "#f97316",
            }}
          >
            <DynamicIcon name={category.icon} className="w-4 h-4" />
          </div>
          <span className="text-xs text-slate-300 font-mono">
            {category.icon || "Utensils"}
          </span>
        </div>
      </td>

      {/* Cantidad Productos */}
      <td className="px-4 py-3 text-sm text-slate-400 text-center">
        {category._count?.items ?? 0} platos
      </td>

      {/* Estado Activo Switch */}
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onToggleActive(category)}
          className={`p-1.5 rounded-lg border transition-all ${
            category.isActive
              ? "bg-emerald-950/50 border-emerald-700/60 text-emerald-400 hover:bg-emerald-900/50"
              : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
          }`}
          title={category.isActive ? "Desactivar" : "Activar"}
        >
          {category.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </td>

      {/* Acciones */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => onEdit(category)}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
            title="Editar categoría"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(category.id)}
            className="p-1.5 text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-900/50 border border-red-900/40 rounded-lg transition"
            title="Eliminar categoría"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminCategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    icon: "Utensils",
    image: "",
    color: "#f97316",
    isActive: true,
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      const json = await res.json();
      if (json.success) {
        setCategories(json.data);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Manejador Drag & Drop
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);

    const reordered = arrayMove(categories, oldIndex, newIndex).map((item, idx) => ({
      ...item,
      order: idx,
    }));

    setCategories(reordered);
    setIsSavingOrder(true);

    try {
      const orderedIds = reordered.map((c) => c.id);
      await fetch("/api/admin/categories/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
    } catch (err) {
      console.error("Error guardando orden:", err);
      fetchCategories(); // Rollback en caso de error
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Abrir modal para crear
  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      slug: "",
      icon: "Utensils",
      image: "",
      color: "#f97316",
      isActive: true,
    });
    setModalOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEdit = (c: Category) => {
    setEditingCategory(c);
    setFormData({
      name: c.name,
      slug: c.slug,
      icon: c.icon || "Utensils",
      image: c.image || "",
      color: c.color || "#f97316",
      isActive: c.isActive,
    });
    setModalOpen(true);
  };

  // Auto-slug al escribir el nombre
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (!editingCategory) {
      const generatedSlug = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setFormData((prev) => ({ ...prev, name, slug: generatedSlug }));
    } else {
      setFormData((prev) => ({ ...prev, name }));
    }
  };

  // Subida de imagen
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const form = new FormData();
    form.append("file", file);
    form.append("slug", formData.slug || "categoria");

    try {
      const res = await fetch("/api/admin/categories/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (data.success) {
        setFormData((prev) => ({ ...prev, image: data.imageUrl }));
      }
    } catch (err) {
      console.error("Error subiendo imagen:", err);
    } finally {
      setUploadingImage(false);
    }
  };

  // Guardar formulario
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        // Actualizar
        const res = await fetch(`/api/admin/categories/${editingCategory.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          setModalOpen(false);
          fetchCategories();
        }
      } else {
        // Crear
        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          setModalOpen(false);
          fetchCategories();
        }
      }
    } catch (err) {
      console.error("Error guardando categoría:", err);
    }
  };

  // Toggle activo directo
  const handleToggleActive = async (c: Category) => {
    try {
      const res = await fetch(`/api/admin/categories/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      if (res.ok) {
        setCategories((prev) =>
          prev.map((item) => (item.id === c.id ? { ...item, isActive: !item.isActive } : item))
        );
      }
    } catch (err) {
      console.error("Error toggling active:", err);
    }
  };

  // Eliminar
  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar o desactivar esta categoría?")) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchCategories();
      }
    } catch (err) {
      console.error("Error deleting category:", err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            Gestión de Categorías
            {isSavingOrder && (
              <span className="text-xs font-normal text-amber-400 bg-amber-950/60 border border-amber-800 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Guardando orden...
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Crea categorías ilimitadas, asigna iconos, fotos y arrastra las filas para definir el orden en el menú.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-xl shadow-lg shadow-orange-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva Categoría</span>
        </button>
      </div>

      {/* Contenedor Tabla Drag & Drop */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <p>Cargando categorías...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <p className="text-lg font-medium text-slate-300">No hay categorías configuradas</p>
            <p className="text-sm max-w-sm mx-auto">
              Comienza agregando la primera categoría con el botón superior.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <th className="w-10 px-3 py-3.5 text-center"></th>
                    <th className="w-14 px-3 py-3.5 text-center">Orden</th>
                    <th className="w-20 px-3 py-3.5">Foto</th>
                    <th className="px-4 py-3.5">Categoría</th>
                    <th className="px-4 py-3.5">Icono / Color</th>
                    <th className="px-4 py-3.5 text-center">Platos</th>
                    <th className="px-4 py-3.5 text-center">Visible</th>
                    <th className="px-4 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <SortableContext
                  items={categories.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody className="divide-y divide-slate-800/40">
                    {categories.map((category) => (
                      <SortableCategoryRow
                        key={category.id}
                        category={category}
                        onEdit={handleOpenEdit}
                        onToggleActive={handleToggleActive}
                        onDelete={handleDelete}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </div>
          </DndContext>
        )}
      </div>

      {/* Modal Crear / Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">
                {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-5">
              {/* Nombre y Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleNameChange}
                    placeholder="Ej. Hamburguesas"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-orange-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                    Slug / Clave *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value.toLowerCase() })
                    }
                    placeholder="ej. hamburguesas"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-orange-500 text-sm"
                  />
                </div>
              </div>

              {/* Color y Selector de Iconos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300 uppercase">
                    Icono y Color
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Color:</span>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>

                {/* Grid de iconos rápidos */}
                <div className="grid grid-cols-6 gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800 max-h-36 overflow-y-auto">
                  {AVAILABLE_ICONS.map((iconName) => {
                    const isSelected = formData.icon === iconName;
                    return (
                      <button
                        type="button"
                        key={iconName}
                        onClick={() => setFormData({ ...formData, icon: iconName })}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition ${
                          isSelected
                            ? "bg-orange-600/20 border-orange-500 text-orange-400"
                            : "border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white"
                        }`}
                      >
                        <DynamicIcon name={iconName} className="w-5 h-5" />
                        <span className="text-[10px] mt-1 truncate max-w-full font-mono">
                          {iconName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subida de Imagen */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase">
                  Imagen de Fondo (Tarjeta de Menú)
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-16 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden flex items-center justify-center relative flex-shrink-0">
                    {formData.image ? (
                      <img
                        src={formData.image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition">
                        <Upload className="w-4 h-4" />
                        <span>{uploadingImage ? "Subiendo..." : "Seleccionar Archivo"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          disabled={uploadingImage}
                          className="hidden"
                        />
                      </label>
                      {formData.image && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image: "" })}
                          className="p-2 text-red-400 hover:bg-red-950/40 rounded-lg border border-red-900/40 text-xs"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Recomendado 640x360 WebP / JPG / PNG. Se optimiza automáticamente.
                    </p>
                  </div>
                </div>
              </div>

              {/* Switch Visibilidad */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <div className="text-sm font-semibold text-white">Categoría Visible</div>
                  <div className="text-xs text-slate-400">
                    Si se desmarca, se ocultará en el POS y la carta digital.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 accent-orange-600 rounded cursor-pointer"
                />
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold shadow-lg shadow-orange-600/20 transition"
                >
                  {editingCategory ? "Guardar Cambios" : "Crear Categoría"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 4. Componente CategorySelector.tsx (/menu)

Ubicación: `apps/cajero/components/pos/CategorySelector.tsx` (o compartido en `packages/ui` / `apps/menu`)

Este componente implementa de manera completa los **2 Estados** especificados:
- **Estado A (Sin categoría activa):** Grid de tarjetas grandes (`h-32`), foto arriba + franja oscura abajo con icono y nombre. Si no tiene foto, tarjeta con fondo estilizado centrado.
- **Estado B (Con categoría activa):** Barra compacta horizontal de 48px con botón "Volver" a la izquierda. Los no activos son botones cuadrados compactos con solo icono; la categoría activa se expande en ancho con icono + nombre.

```tsx
"use client";

import React, { useMemo } from "react";
import * as Icons from "lucide-react";
import { ArrowLeft, Utensils } from "lucide-react";

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  image: string | null;
  color: string | null;
  order: number;
  isActive: boolean;
}

interface CategorySelectorProps {
  categories: CategoryItem[];
  activeSlug: string | null;
  onSelectCategory: (slug: string | null) => void;
  className?: string;
}

// Icon helper seguro
const DynamicIcon = ({
  name,
  className,
  style,
}: {
  name: string | null;
  className?: string;
  style?: React.CSSProperties;
}) => {
  if (!name) return <Utensils className={className} style={style} />;
  const IconComp = (Icons as Record<string, any>)[name] || Utensils;
  return <IconComp className={className} style={style} />;
};

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  activeSlug,
  onSelectCategory,
  className = "",
}) => {
  // Filtrar solo las activas y respetar el orden 'order'
  const visibleCategories = useMemo(() => {
    return categories
      .filter((c) => c.isActive)
      .sort((a, b) => a.order - b.order);
  }, [categories]);

  const activeCategory = useMemo(() => {
    return visibleCategories.find((c) => c.slug === activeSlug) || null;
  }, [visibleCategories, activeSlug]);

  const isIdle = activeSlug === null;

  // =========================================================================
  // ESTADO B: CON CATEGORÍA SELECCIONADA (Barra compacta horizontal)
  // =========================================================================
  if (!isIdle) {
    return (
      <div className={`w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800 p-2.5 ${className}`}>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
          {/* Botón Volver (Regresa al Grid del Estado A) */}
          <button
            onClick={() => onSelectCategory(null)}
            className="flex-shrink-0 h-12 px-3.5 bg-red-600/90 hover:bg-red-500 text-white rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-red-600/20 active:scale-95 transition-all"
            title="Volver a todas las categorías"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            <span className="text-sm uppercase tracking-wider hidden sm:inline">Volver</span>
          </button>

          {/* Carrusel de Categorías */}
          {visibleCategories.map((cat) => {
            const isActive = cat.slug === activeSlug;
            const itemColor = cat.color || "#f97316";

            if (isActive) {
              // Categoría Activa: Expandida con icono + nombre
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(null)} // Click en activa vuelve a contraer o deseleccionar
                  className="flex-shrink-0 h-12 px-5 rounded-xl bg-orange-600 text-white flex items-center gap-3 font-bold text-sm shadow-lg shadow-orange-600/30 border border-orange-400/30 transition-all scale-[1.02]"
                >
                  <DynamicIcon name={cat.icon} className="w-5 h-5 stroke-[2.2]" />
                  <span className="tracking-wide whitespace-nowrap">{cat.name}</span>
                </button>
              );
            }

            // Categoría Inactiva: Solo icono cuadrado 48x48
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.slug)}
                style={{
                  color: itemColor,
                }}
                className="flex-shrink-0 h-12 w-12 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                title={cat.name}
              >
                <DynamicIcon name={cat.icon} className="w-5 h-5" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // ESTADO A: SIN CATEGORÍA SELECCIONADA (Grid de Tarjetas Grandes h-32)
  // =========================================================================
  return (
    <div className={`w-full p-4 ${className}`}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
        {visibleCategories.map((cat) => {
          const itemColor = cat.color || "#f97316";

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.slug)}
              className="group relative h-32 rounded-2xl overflow-hidden border border-slate-800 hover:border-orange-500/60 bg-slate-900 transition-all duration-200 hover:scale-[1.03] hover:shadow-xl hover:shadow-orange-950/20 active:scale-[0.98] flex flex-col text-left"
            >
              {cat.image ? (
                // Con Imagen: Foto arriba (flex-1) + barra oscura abajo con icono y nombre
                <>
                  <div className="flex-1 w-full relative overflow-hidden bg-slate-950">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/20" />
                  </div>
                  <div className="w-full h-11 px-3 bg-slate-950/95 border-t border-slate-800/80 flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ color: itemColor }}
                    >
                      <DynamicIcon name={cat.icon} className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <span className="text-xs font-bold text-white truncate group-hover:text-orange-400 transition-colors">
                      {cat.name}
                    </span>
                  </div>
                </>
              ) : (
                // Sin Imagen: Diseño limpio centrado con gradiente temático
                <div className="w-full h-full p-4 flex flex-col justify-between relative overflow-hidden">
                  <div
                    className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-20 pointer-events-none"
                    style={{ backgroundColor: itemColor }}
                  />
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm"
                    style={{
                      backgroundColor: `${itemColor}15`,
                      borderColor: `${itemColor}40`,
                      color: itemColor,
                    }}
                  >
                    <DynamicIcon name={cat.icon} className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-sm font-black text-white group-hover:text-orange-400 transition-colors line-clamp-2">
                      {cat.name}
                    </span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
```

---

## 5. Instrucciones de Implementación para OpenCode

1. **Instalar dependencias necesarias:**
   ```bash
   pnpm add --filter admin @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities lucide-react sharp
   ```

2. **Actualizar Prisma Schema y Migrar:**
   - Pegar el modelo `Category` en `packages/db/prisma/schema.prisma`.
   - Ejecutar: `pnpm --filter db prisma migrate dev --name add_category_table` o `pnpm db:push`.

3. **Copiar Endpoints:**
   - Crear los archivos de API en `apps/admin/app/api/admin/categories/route.ts`, `[id]/route.ts`, `reorder/route.ts`, y `upload/route.ts`.

4. **Crear Vista de Admin:**
   - En `apps/admin/app/(dashboard)/admin/categorias/page.tsx`, renderizar `<AdminCategoryManager />`.

5. **Reemplazar barra en `/menu` y POS:**
   - En el punto donde se renderiza la barra actual (ej. `pos-category-bar.tsx` o la pantalla de `/menu`), sustituirla por `<CategorySelector categories={categoriesFromApi} activeSlug={selectedCategory} onSelectCategory={setSelectedCategory} />`.
