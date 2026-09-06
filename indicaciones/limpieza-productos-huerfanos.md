# Limpieza de productos huérfanos — catálogo antiguo (Bibosi / LA MILANESA)

## Lógica aplicada (SQL de referencia, adaptada a la tabla `producto` del dump antiguo)

```sql
UPDATE producto p
JOIN categoria c ON p.categoria = c.texto
SET p.estado = 0
WHERE c.estado = 0 AND p.estado = 1;
```

## Resultado

| Métrica | Valor |
|---|---|
| Categorías totales en el catálogo | 34 |
| Categorías inactivas (`estado=0`) | 14 |
| Productos totales | 613 |
| Productos activos (`estado=1`) | 343 |
| **Productos desactivados por la consulta (huérfanos)** | **157** |

## Detalle de productos desactivados

| idProducto | Descripción | Categoría (inactiva) |
|---|---|---|
| 1 | Clasica RES | RES |
| 4 | Napolitana RES | RES |
| 5 | Milañon RES | RES |
| 8 | Clasica POLLO | POLLO |
| 9 | Picada POLLO | POLLO |
| 10 | Milapizza POLLO | POLLO |
| 11 | Napolitana POLLO | POLLO |
| 12 | Milañon POLLO | POLLO |
| 18 | Guarana 2 Lts | GASEOSAS |
| 19 | Guarana 500 ml | GASEOSAS |
| 20 | 7 up 2 Lts | GASEOSAS |
| 21 | 7 up 500 ml | GASEOSAS |
| 22 | Pepsi 2 Lts | GASEOSAS |
| 23 | Pepsi 1 Lt | GASEOSAS |
| 24 | Pepsi 500 ml | GASEOSAS |
| 25 | Limonada | REFRESCOS |
| 29 | Agua | REFRESCOS |
| 33 | Coca 1 Ltr | COCA |
| 34 | Coca 500 ml | COCA |
| 37 | Fanta 2 Lts | FANTA |
| 38 | Fanta 1 Lts | COCA |
| 39 | Fanta 500 ml | FANTA |
| 40 | Fanta Lata 350 ml | FANTA |
| 41 | Fanta Lata 222 ml | FANTA |
| 42 | Sprite 1 1/2 | COCA |
| 43 | Sprite 1 Lts | COCA |
| 44 | Sprite 500 ml | SPRITE |
| 45 | Sprite Lata 350 ml | SPRITE |
| 46 | Sprite Lata 222 ml | SPRITE |
| 54 | Piña | REFRESCOS |
| 55 | Grosella | REFRESCOS |
| 60 | AMERICANA RES | RES |
| 61 | AMERICANA POLLO | POLLO |
| 62 | PICADA | DELIVERY |
| 63 | CLASICA | DELIVERY |
| 64 | Sandwich Clasico | DELIVERY |
| 65 | AMERICANA | PEDIDOSYA |
| 66 | MILAPIZZA | PEDIDOSYA |
| 67 | NAPOLITANA | PEDIDOSYA |
| 69 | JARRA | REFRESCOS |
| 70 | POSTRE 12 | POSTRES |
| 73 | POSTRE 8 | POSTRES |
| 74 | POSTRE 10 | POSTRES |
| 75 | MILAÑON | PEDIDOSYA |
| 76 | PICADA | PEDIDOSYA |
| 77 | CLASICA | PEDIDOSYA |
| 78 | Sandwich Clasico | PEDIDOSYA |
| 79 | CROCANTES | PEDIDOSYA |
| 80 | PICANTES | PEDIDOSYA |
| 81 | BARBACOA | PEDIDOSYA |
| 82 | MIEL Y MOSTAZA | PEDIDOSYA |
| 83 | PAPAS | PEDIDOSYA |
| 84 | ARROZ | PEDIDOSYA |
| 85 | PEPSI 500 ml | PEDIDOSYA |
| 203 | Milacesar | PEDIDOSYA |
| 204 | Sandwich Americano | PEDIDOSYA |
| 205 | Sandwich Napolitano | PEDIDOSYA |
| 223 | H2OH | GASEOSAS |
| 224 | Achachairu | REFRESCOS |
| 225 | Bitter | REFRESCOS |
| 235 | Guarana 1 lts | GASEOSAS |
| 236 | Tamarindo | REFRESCOS |
| 240 | Papas | DELIVERY |
| 242 | Arroz | DELIVERY |
| 246 | Acerola | REFRESCOS |
| 247 | Guarana 500 ml | DELIVERY |
| 251 | Fanta 2 litros | COCA |
| 255 | Maracuya | REFRESCOS |
| 273 | mocochinchi | REFRESCOS |
| 281 | pepsi 500ml | DELIVERY |
| 282 | Napolitna 35 | PEDIDOSYA |
| 283 | copuazu | REFRESCOS |
| 285 | 7 up 500 ml | DELIVERY |
| 286 | toronja | REFRESCOS |
| 288 | cocacola 1 1/2  ltrs | COCA |
| 294 | Naranja | REFRESCOS |
| 309 | COMBO A | CHIFA |
| 310 | COMBO B | CHIFA |
| 311 | COMBO C | CHIFA |
| 312 | C ECONOMICO | CHIFA |
| 313 | COSTILLA CERDO. A. | CHIFA |
| 316 | CARNE CON BROCOLI | CHIFA |
| 318 | TALLARIN CHOP SUEY | CHIFA |
| 319 | ARROZ CHAUFA | CHIFA |
| 320 | ARROZ CHOP SUEY | CHIFA |
| 350 | guarana 222ml | COCA |
| 355 | HAWAIANA POLLO | POLLO |
| 356 | 4 QUESOS POLLO | POLLO |
| 357 | HAWAIANA RES | RES |
| 358 | 4 QUESOS RES | RES |
| 359 | LITRO | REFRESCOS |
| 375 | CLASICO SIN PAPAS | POLLO |
| 385 | Cocacola 2litrs | COCA |
| 393 | 7UP 1 litro | GASEOSAS |
| 400 | ASAI | REFRESCOS |
| 411 | EXPLOSIVA | GRANDE |
| 412 | CAPUCHINO | GRANDE |
| 413 | OREO | GRANDE |
| 414 | ACCAI CON TE NEGRO | GRANDE |
| 415 | CHOCOLATE | GRANDE |
| 416 | COCO | GRANDE |
| 417 | FRUTICOCO | GRANDE |
| 418 | FRUTILIMON | GRANDE |
| 419 | FRUTILLA AGUA | GRANDE |
| 420 | FRUTILLA LECHE | GRANDE |
| 421 | ICE TEA LIMON | GRANDE |
| 422 | LIMON | GRANDE |
| 423 | LIMONADA BRASILERA | GRANDE |
| 424 | MANGO | GRANDE |
| 425 | MANZANA | GRANDE |
| 426 | MORA | GRANDE |
| 427 | NARANJA | GRANDE |
| 428 | TARO | GRANDE |
| 429 | TE VERDE CON MANZANA | GRANDE |
| 430 | VAINILLA | GRANDE |
| 442 | PIÑA COLADA | GRANDE |
| 443 | FRUTOS ROJOS | GRANDE |
| 445 | MATCHA | GRANDE |
| 446 | EXPLOSIVA extra-grande | EXTRA GRANDE |
| 447 | JELIS extra-grande | EXTRA GRANDE |
| 448 | CAPUCHINO extra-grande | EXTRA GRANDE |
| 449 | OREO extra-grande | EXTRA GRANDE |
| 450 | FRUTICOCO extra-grande | EXTRA GRANDE |
| 451 | TARO extra-grande | EXTRA GRANDE |
| 452 | PIÑA COLADA extra-grande | EXTRA GRANDE |
| 453 | LIMONADA BRASILERA extra-grand | EXTRA GRANDE |
| 454 | FRUTILIMON extra-grande | EXTRA GRANDE |
| 455 | MATCHA extra-grande | EXTRA GRANDE |
| 456 | COCO extra-grande | EXTRA GRANDE |
| 457 | VAINILLA extra-grande | EXTRA GRANDE |
| 458 | FRUTILLA LECHE extra-grand | EXTRA GRANDE |
| 459 | CHOCOLATE extra-grande | EXTRA GRANDE |
| 460 | MORA extra-grande | EXTRA GRANDE |
| 461 | FRUTILLA AGUA extra-grande | EXTRA GRANDE |
| 462 | PIÑA extra-grande | EXTRA GRANDE |
| 463 | MANZANA extra-grande | EXTRA GRANDE |
| 464 | NARANJA extra-grande | EXTRA GRANDE |
| 465 | LIMON extra-grande | EXTRA GRANDE |
| 466 | MANGO extra-grande | EXTRA GRANDE |
| 467 | FRUTOS ROJOS extra-grande | EXTRA GRANDE |
| 468 | ICE TEA DE LIMON extra-grande | EXTRA GRANDE |
| 469 | TE VERDE CON MANZANA ex-grand | EXTRA GRANDE |
| 470 | ACAI CON TE NEGRO extra-grand | EXTRA GRANDE |
| 473 | Durazno | REFRESCOS |
| 474 | mandarina | REFRESCOS |
| 475 | carambola | REFRESCOS |
| 479 | GELATINA | POSTRES |
| 480 | CIFRUT | GASEOSAS |
| 481 | AGUA DE 1 1/2 | REFRESCOS |
| 482 | TRINY | COCA |
| 483 | Fanta 1 1/2 | COCA |
| 484 | Sprite 2L | COCA |
| 486 | fannta 500ml | COCA |
| 491 | Guarana 250ml | GASEOSAS |
| 492 | coca cola peque | COCA |
| 493 | 7up 250 mil | GASEOSAS |
| 494 | coca cola mini | COCA |

## Notas

- La tabla `producto` del sistema actual de bbspos **no existe**: el esquema Prisma/SQLite usa `Flavor`/`Size`/`BobaType`/`Topping` con campos `available`, y las categorías son un enum (`MILK`, `WATER`, `SPECIAL`) sin estado de activación. Por lo tanto, **no hay registros asociables ni nada que desactivar** en `packages/db/prisma/dev.db` (conteo 0).
- Este informe aplica la lógica al volcado histórico `bbs Antiguo.sql` (catálogo antiguo), asumiendo `JOIN p.categoria = c.texto` con colación insensible a mayúsculas, igual que MySQL latin1.
- No se ejecutó escritura alguna: el dump es un archivo estático (no hay motor MySQL). El conteo refleja **cuántos quedarían desactivados** de ejecutar ese UPDATE en la base original.
- **Script listo para ejecutar en la BD original:** `limpieza-productos-huerfanos.sql` (incluye verificación previa `SELECT` → 157, el `UPDATE`, y verificación posterior → 0).