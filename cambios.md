

> Necesito que rediseñes la estructura de datos y la lógica de la interfaz de venta para la nueva categoría de bebidas "Bubble Drinks". 
> 
> El precio del producto final no es fijo; se calcula dinámicamente basándose en una matriz de combinaciones. Debes crear un producto base y utilizar "Grupos de Modificadores" para determinar el precio final.
> 
> **1. Categorías y Sabores (El usuario debe seleccionar una categoría y luego un sabor):**
> *   **ESPECIALES:** Capuchino, Oreo, Fruticoco, Matcha, Piña colada, Limonada brasilera, Frutilimon, Taro.
> *   **CON AGUA:** Frutilla, Limón, Piña, Manzana, Naranja, Mango.
> *   **CON LECHE:** Coco, Vainilla, Chocolate, Mora, Frutilla.
> 
> **2. Modificadores Obligatorios (El usuario debe seleccionar el tamaño y el tipo de boba, lo cual define el precio según la categoría elegida):**
> *   Tamaño: Grande o Extragrande.
> *   Tipo de Boba: Tapioca o Explosivas.
> 
> **3. Matriz de Precios según Categoría:**
> *   **Si es ESPECIALES:** Grande+Tapioca = 20 Bs | Extragrande+Tapioca = 30 Bs | Grande+Explosiva = 25 Bs | Extragrande+Explosiva = 35 Bs.
> *   **Si es CON AGUA:** Grande+Tapioca = 16 Bs | Extragrande+Tapioca = 25 Bs | Grande+Explosiva = 20 Bs | Extragrande+Explosiva = 30 Bs.
> *   **Si es CON LECHE:** Grande+Tapioca = 18 Bs | Extragrande+Tapioca = 28 Bs | Grande+Explosiva = 22 Bs | Extragrande+Explosiva = 32 Bs.
> 
> **4. Modificadores Opcionales (Topping Extra):**
> Estos son "add-ons" de selección múltiple que se suman al precio base calculado arriba:
> *   Bobbas de tapioca extra: +4 Bs.
> *   Bobbas explosivas extra: +5 Bs.
> 
> Por favor, genera las especificaciones de los componentes de la interfaz de usuario (UI) para la toma de pedidos y las tablas SQL necesarias para registrar estas transacciones con sus respectivos modificadores.
