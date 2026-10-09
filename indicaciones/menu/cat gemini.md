# SOLUCIÓN COMPLETA: MÓDULO DE CATEGORÍAS ADMINISTRABLE

Este documento contiene la implementación completa para migrar las categorías hardcodeadas a una base de datos dinámica con gestión de Drag & Drop y un selector visual de 2 estados.

## 1. Schema de Base de Datos (Prisma)

Añade este modelo a tu `schema.prisma`. Reemplazará la necesidad de usar el enum estático `MenuCategory`.

```prisma
// packages/db/prisma/schema.prisma

model Category {
  id        String   @id @default(cuid())
  key       String   @unique          // Identificador único tipo slug (ej. "MILANESAS")
  name      String                    // Nombre visible (ej. "Milanesas")
  iconName  String?                   // Nombre del icono de Lucide (ej. "Utensils")
  color     String?                   // Clase de color Tailwind (ej. "text-emerald-500")
  imageUrl  String?                   // URL de la imagen de fondo subida
  order     Int      @default(0)      // Posición para el Drag & Drop
  isActive  Boolean  @default(true)   // Estado (activa/inactiva)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([order])
}
```

---

## 2. API Routes (Backend)

Crea estos archivos para manejar el CRUD y el reordenamiento.

### A) GET y POST `/api/admin/categories/route.ts`
```typescript
// apps/admin/app/api/admin/categories/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@bbspos/db";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: "asc" },
    });
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching categories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    // Obtener el último orden para ponerlo al final
    const lastCat = await prisma.category.findFirst({
      orderBy: { order: "desc" },
    });
    const newOrder = lastCat ? lastCat.order + 1 : 0;

    const category = await prisma.category.create({
      data: { ...data, order: newOrder },
    });
    return NextResponse.json(category);
  } catch (error) {
    return NextResponse.json({ error: "Error creating category" }, { status: 500 });
  }
}
```

### B) PUT `/api/admin/categories/reorder/route.ts`
```typescript
// apps/admin/app/api/admin/categories/reorder/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@bbspos/db";

export async function PUT(req: Request) {
  try {
    // Recibe un array de IDs en el nuevo orden
    const { orderedIds }: { orderedIds: string[] } = await req.json();

    // Actualiza el orden en la base de datos en una transacción
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.category.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error reordering categories" }, { status: 500 });
  }
}
```

---

## 3. Componente de Admin (Drag & Drop)

*Requisito previo: Instalar dependencias Dnd-Kit en el admin:*
`pnpm --filter admin add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

```tsx
// apps/admin/components/AdminCategoryManager.tsx
"use client";

import React, { useEffect, useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImageIcon, Eye, EyeOff } from "lucide-react";

type Category = { id: string; name: string; iconName: string; isActive: boolean; imageUrl: string | null };

function SortableCategoryItem({ category }: { category: Category }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: category.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-4 mb-2 bg-slate-800 rounded-lg border border-slate-700">
      <div className="flex items-center gap-4">
        <div {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-white">
          <GripVertical size={20} />
        </div>
        <div className="w-12 h-12 bg-slate-900 rounded-md overflow-hidden flex items-center justify-center">
          {category.imageUrl ? (
            <img src={category.imageUrl} alt={category.name} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="text-slate-500" size={20} />
          )}
        </div>
        <div>
          <h3 className="font-semibold text-white">{category.name}</h3>
          <p className="text-sm text-slate-400">Icono: {category.iconName || "Ninguno"}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-2 py-1 text-xs rounded-full ${category.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
          {category.isActive ? "Activa" : "Inactiva"}
        </span>
        <button className="p-2 bg-slate-700 rounded-md hover:bg-slate-600 text-white">Editar</button>
      </div>
    </div>
  );
}

export default function AdminCategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/admin/categories").then((res) => res.json()).then(setCategories);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setCategories((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newArray = arrayMove(items, oldIndex, newIndex);
        
        fetch("/api/admin/categories/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: newArray.map(c => c.id) })
        });
        
        return newArray;
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-slate-900 rounded-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Gestión de Categorías</h2>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium">
          + Nueva Categoría
        </button>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
        <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {categories.map((category) => (
            <SortableCategoryItem key={category.id} category={category} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
```

---

## 4. Componente de Frontend (El Selector de 2 Estados)

```tsx
// apps/cajero/components/CategorySelector.tsx
"use client";

import React, { useState } from "react";
import * as LucideIcons from "lucide-react";
import { ArrowLeft } from "lucide-react";

const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <IconComponent className={className} size={20} />;
};

type Category = { id: string; name: string; iconName: string; color: string; imageUrl: string | null };

export default function CategorySelector({ categories }: { categories: Category[] }) {
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  const selectedCat = categories.find(c => c.id === selectedCatId);

  // --- ESTADO 1: GRID INICIAL CON IMÁGENES ---
  if (!selectedCatId) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCatId(cat.id)}
            className="flex flex-col rounded-xl overflow-hidden border border-slate-700 bg-slate-800/50 hover:bg-slate-700 transition-all text-left"
          >
            {/* Imagen Arriba */}
            <div className="h-28 bg-slate-800 w-full relative">
              {cat.imageUrl ? (
                <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <DynamicIcon name={cat.iconName || "Image"} className="text-slate-600 opacity-30 w-12 h-12" />
                </div>
              )}
            </div>
            {/* Etiqueta Abajo */}
            <div className="p-3 bg-slate-900/90 flex items-center justify-center gap-2">
              <DynamicIcon name={cat.iconName || "HelpCircle"} className={cat.color || "text-slate-300"} />
              <span className="font-semibold text-white">{cat.name}</span>
            </div>
          </button>
        ))}
      </div>
    );
  }

  // --- ESTADO 2: BARRA COMPACTA HORIZONTAL ---
  return (
    <div className="flex flex-wrap gap-3 items-center p-4 bg-slate-900 border-b border-slate-800">
      {/* Botón Volver */}
      <button 
        onClick={() => setSelectedCatId(null)}
        className="w-12 h-12 flex items-center justify-center bg-red-950/40 text-red-400 hover:bg-red-900/60 rounded-xl border border-red-900/50 transition-colors shrink-0"
      >
        <ArrowLeft size={20} />
      </button>

      {/* Lista de Categorías Compacta */}
      {categories.map((cat) => {
        const isActive = cat.id === selectedCatId;
        return (
          <button
            key={cat.id}
            onClick={() => setSelectedCatId(cat.id)}
            className={`flex items-center justify-center transition-all rounded-xl border shrink-0
              ${isActive 
                ? "px-6 py-3 bg-emerald-950/40 border-emerald-800/50" // Expandida
                : "w-12 h-12 bg-slate-800/50 border-slate-700 hover:bg-slate-700" // Contraída
              }`}
          >
            <DynamicIcon name={cat.iconName || "HelpCircle"} className={cat.color || "text-slate-400"} />
            {isActive && (
              <span className="ml-2 font-semibold text-white whitespace-nowrap">
                {cat.name}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```