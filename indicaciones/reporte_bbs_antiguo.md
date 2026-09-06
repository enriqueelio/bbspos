# Informe de la base de datos antigua — Bibosi (LA MILANESA)

Reporte generado automáticamente a partir del archivo `bbs Antiguo.sql` (dump de MySQL, charset latin1).

- Base de datos: ``bibosi_restaurante``
- MySQL dump 10.13  Distrib 5.6.24, for Win64 (x86_64)
- Host: localhost    Database: bibosi_restaurante
- Server version	5.5.62

## 1. Resumen general

<details open>

<p>

**Datos de la empresa**

</p>

| Campo | Valor |
|---|---|
| Razón social | LA MILANESA Bibosi - Xpress |
| NIT | 1919262015 |
| Propietario | LUIS ENRIQUE ELIO MARIN |
| Sucursal | CASA MATRIZ |
| Zona | Guapetrol |
| Ciudad | TRINIDAD |
| País | Bolivia |
| Teléfono |  |
| IVA (%) | 13 |
| IT (%) | 3 |
| IUE (%) | 25 |

</details>

**Período de operación detectado**

| Concepto | Desde | Hasta |
|---|---|---|
| Ventas (fecha registro) | 2019-12-18 02:41:17 | 2026-09-05 18:11:10 |
| Arqueos | 2020-01-01 23:11:02 | 2026-09-05 15:49:12 |
| Registro de caja (ingresosalida) | 2019-12-18 02:41:17 | 2026-09-05 18:11:10 |

**Totales globales**

| Métrica | Valor |
|---|---|
| Ventas (filas) | 171.739 |
| Ventas válidas (facturadas) | 169.979 |
| Suma total ventas (Bs.) | 6.747.503,00 |
| Suma total ventas válidas (Bs.) | 6.747.503,00 |
| Suma cobrado/acuenta (Bs.) | 6.743.506,00 |
| Suma saldo pendiente (Bs.) | 3.997,00 |
| ICE facturado (Bs.) | 0,00 |
| Descuentos aplicados (Bs.) | 154.007,00 |
| IVA registrado (Bs.) | 877.175,39 |
| Líneas de detalle de venta | 293.428 |
| Unidades vendidas (detalle) | 377.233 |
| Arqueos de caja | 4.222 |
| Registros de caja (ingresosalida) | 165.882 |
| Productos del catálogo | 613 |
| Categorías de producto | 34 |

## 2. Volúmenes de datos por tabla

| Tabla | Filas |
|---|---|
| actividad | 3 |
| arqueo | 4.222 |
| arqueocaja | 50.004 |
| caja | 1 |
| categoria | 34 |
| datos | 1 |
| dosificacion | 2 |
| impresora | 1 |
| ingresosalida | 165.882 |
| leyenda | 39 |
| mesas | 1 |
| moneda | 12 |
| permisos | 216 |
| producto | 613 |
| salas | 1 |
| sucursal | 2 |
| tipocambio | 1 |
| usuarios | 10 |
| ventas | 171.739 |
| ventasdetalle | 293.428 |

## 3. Ventas

### 3.1 Totales por año

| Año | Ventas | Válidas | Total (Bs.) | Total válido (Bs.) | Cobrado (Bs.) | Saldo (Bs.) | ICE (Bs.) |
|---|---|---|---|---|---|---|---|
| 2019 | 334 | 328 | 15.835,00 | 15.835,00 | 15.808,00 | 27,00 | 0,00 |
| 2020 | 2.558 | 2.539 | 100.251,00 | 100.251,00 | 100.251,00 | 0,00 | 0,00 |
| 2021 | 20.852 | 20.587 | 825.037,00 | 825.037,00 | 824.727,00 | 310,00 | 0,00 |
| 2022 | 28.838 | 28.300 | 1.075.559,00 | 1.075.559,00 | 1.075.519,00 | 40,00 | 0,00 |
| 2023 | 30.708 | 30.101 | 1.122.727,00 | 1.122.727,00 | 1.120.708,00 | 2.019,00 | 0,00 |
| 2024 | 29.220 | 28.975 | 1.076.592,00 | 1.076.592,00 | 1.076.214,00 | 378,00 | 0,00 |
| 2025 | 33.024 | 32.980 | 1.380.802,00 | 1.380.802,00 | 1.379.994,00 | 808,00 | 0,00 |
| 2026 | 26.205 | 26.169 | 1.150.700,00 | 1.150.700,00 | 1.150.285,00 | 415,00 | 0,00 |

### 3.2 Evolución mensual

| Mes | Ventas | Válidas | Total (Bs.) | Total válido (Bs.) | Cobrado (Bs.) | Saldo (Bs.) | ICE (Bs.) |
|---|---|---|---|---|---|---|---|
| 2019-12 | 334 | 328 | 15.835,00 | 15.835,00 | 15.808,00 | 27,00 | 0,00 |
| 2020-01 | 1.399 | 1.383 | 52.930,00 | 52.930,00 | 52.930,00 | 0,00 | 0,00 |
| 2020-02 | 1.043 | 1.040 | 43.290,00 | 43.290,00 | 43.290,00 | 0,00 | 0,00 |
| 2020-03 | 116 | 116 | 4.031,00 | 4.031,00 | 4.031,00 | 0,00 | 0,00 |
| 2021-02 | 596 | 592 | 25.794,00 | 25.794,00 | 25.484,00 | 310,00 | 0,00 |
| 2021-03 | 1.763 | 1.748 | 71.098,00 | 71.098,00 | 71.098,00 | 0,00 | 0,00 |
| 2021-04 | 1.538 | 1.533 | 64.807,00 | 64.807,00 | 64.807,00 | 0,00 | 0,00 |
| 2021-05 | 1.919 | 1.914 | 79.225,00 | 79.225,00 | 79.225,00 | 0,00 | 0,00 |
| 2021-06 | 1.781 | 1.770 | 69.889,00 | 69.889,00 | 69.889,00 | 0,00 | 0,00 |
| 2021-07 | 1.828 | 1.810 | 74.805,00 | 74.805,00 | 74.805,00 | 0,00 | 0,00 |
| 2021-08 | 1.987 | 1.963 | 78.876,00 | 78.876,00 | 78.876,00 | 0,00 | 0,00 |
| 2021-09 | 2.387 | 2.331 | 89.341,00 | 89.341,00 | 89.341,00 | 0,00 | 0,00 |
| 2021-10 | 2.284 | 2.244 | 83.613,00 | 83.613,00 | 83.613,00 | 0,00 | 0,00 |
| 2021-11 | 2.245 | 2.206 | 85.680,00 | 85.680,00 | 85.680,00 | 0,00 | 0,00 |
| 2021-12 | 2.524 | 2.476 | 101.909,00 | 101.909,00 | 101.909,00 | 0,00 | 0,00 |
| 2022-01 | 2.564 | 2.539 | 100.870,00 | 100.870,00 | 100.870,00 | 0,00 | 0,00 |
| 2022-02 | 2.074 | 2.043 | 77.037,00 | 77.037,00 | 77.037,00 | 0,00 | 0,00 |
| 2022-03 | 3.043 | 2.993 | 99.259,00 | 99.259,00 | 99.259,00 | 0,00 | 0,00 |
| 2022-04 | 2.219 | 2.196 | 85.303,00 | 85.303,00 | 85.303,00 | 0,00 | 0,00 |
| 2022-05 | 2.366 | 2.322 | 91.524,00 | 91.524,00 | 91.524,00 | 0,00 | 0,00 |
| 2022-06 | 2.229 | 2.174 | 86.409,00 | 86.409,00 | 86.409,00 | 0,00 | 0,00 |
| 2022-07 | 2.256 | 2.221 | 88.102,00 | 88.102,00 | 88.102,00 | 0,00 | 0,00 |
| 2022-08 | 2.223 | 2.179 | 82.070,00 | 82.070,00 | 82.070,00 | 0,00 | 0,00 |
| 2022-09 | 2.058 | 2.021 | 72.897,00 | 72.897,00 | 72.857,00 | 40,00 | 0,00 |
| 2022-10 | 2.481 | 2.408 | 90.203,00 | 90.203,00 | 90.203,00 | 0,00 | 0,00 |
| 2022-11 | 2.576 | 2.505 | 94.660,00 | 94.660,00 | 94.660,00 | 0,00 | 0,00 |
| 2022-12 | 2.749 | 2.699 | 107.225,00 | 107.225,00 | 107.225,00 | 0,00 | 0,00 |
| 2023-01 | 2.646 | 2.549 | 100.941,00 | 100.941,00 | 100.941,00 | 0,00 | 0,00 |
| 2023-02 | 2.326 | 2.250 | 88.567,00 | 88.567,00 | 88.567,00 | 0,00 | 0,00 |
| 2023-03 | 2.390 | 2.328 | 89.565,00 | 89.565,00 | 89.565,00 | 0,00 | 0,00 |
| 2023-04 | 2.544 | 2.488 | 91.969,00 | 91.969,00 | 91.969,00 | 0,00 | 0,00 |
| 2023-05 | 2.748 | 2.699 | 98.313,00 | 98.313,00 | 96.845,00 | 1.468,00 | 0,00 |
| 2023-06 | 2.619 | 2.575 | 93.406,00 | 93.406,00 | 93.133,00 | 273,00 | 0,00 |
| 2023-07 | 2.574 | 2.507 | 95.543,00 | 95.543,00 | 95.543,00 | 0,00 | 0,00 |
| 2023-08 | 2.369 | 2.325 | 81.208,00 | 81.208,00 | 81.208,00 | 0,00 | 0,00 |
| 2023-09 | 2.452 | 2.414 | 87.613,00 | 87.613,00 | 87.613,00 | 0,00 | 0,00 |
| 2023-10 | 2.546 | 2.517 | 89.146,00 | 89.146,00 | 89.146,00 | 0,00 | 0,00 |
| 2023-11 | 2.664 | 2.645 | 97.839,00 | 97.839,00 | 97.561,00 | 278,00 | 0,00 |
| 2023-12 | 2.830 | 2.804 | 108.617,00 | 108.617,00 | 108.617,00 | 0,00 | 0,00 |
| 2024-01 | 2.411 | 2.386 | 92.126,00 | 92.126,00 | 92.126,00 | 0,00 | 0,00 |
| 2024-02 | 2.273 | 2.253 | 85.268,00 | 85.268,00 | 85.268,00 | 0,00 | 0,00 |
| 2024-03 | 2.624 | 2.593 | 95.774,00 | 95.774,00 | 95.774,00 | 0,00 | 0,00 |
| 2024-04 | 2.452 | 2.421 | 86.838,00 | 86.838,00 | 86.838,00 | 0,00 | 0,00 |
| 2024-05 | 2.694 | 2.659 | 101.418,00 | 101.418,00 | 101.388,00 | 30,00 | 0,00 |
| 2024-06 | 2.663 | 2.627 | 94.171,00 | 94.171,00 | 94.171,00 | 0,00 | 0,00 |
| 2024-07 | 2.672 | 2.634 | 97.887,00 | 97.887,00 | 97.887,00 | 0,00 | 0,00 |
| 2024-08 | 2.574 | 2.567 | 93.251,00 | 93.251,00 | 93.251,00 | 0,00 | 0,00 |
| 2024-09 | 2.043 | 2.037 | 71.170,00 | 71.170,00 | 71.122,00 | 48,00 | 0,00 |
| 2024-10 | 2.062 | 2.057 | 70.105,00 | 70.105,00 | 70.105,00 | 0,00 | 0,00 |
| 2024-11 | 2.276 | 2.268 | 84.345,00 | 84.345,00 | 84.152,00 | 193,00 | 0,00 |
| 2024-12 | 2.476 | 2.473 | 104.239,00 | 104.239,00 | 104.132,00 | 107,00 | 0,00 |
| 2025-01 | 2.285 | 2.281 | 94.368,00 | 94.368,00 | 94.368,00 | 0,00 | 0,00 |
| 2025-02 | 1.901 | 1.900 | 76.527,00 | 76.527,00 | 76.460,00 | 67,00 | 0,00 |
| 2025-03 | 2.494 | 2.486 | 102.208,00 | 102.208,00 | 102.128,00 | 80,00 | 0,00 |
| 2025-04 | 2.413 | 2.409 | 97.364,00 | 97.364,00 | 97.244,00 | 120,00 | 0,00 |
| 2025-05 | 2.699 | 2.692 | 106.299,00 | 106.299,00 | 106.299,00 | 0,00 | 0,00 |
| 2025-06 | 2.723 | 2.720 | 114.312,00 | 114.312,00 | 114.204,00 | 108,00 | 0,00 |
| 2025-07 | 2.864 | 2.864 | 119.340,00 | 119.340,00 | 119.163,00 | 177,00 | 0,00 |
| 2025-08 | 3.092 | 3.090 | 130.081,00 | 130.081,00 | 129.947,00 | 134,00 | 0,00 |
| 2025-09 | 3.133 | 3.128 | 129.760,00 | 129.760,00 | 129.684,00 | 76,00 | 0,00 |
| 2025-10 | 3.234 | 3.228 | 133.942,00 | 133.942,00 | 133.937,00 | 5,00 | 0,00 |
| 2025-11 | 3.088 | 3.087 | 133.554,00 | 133.554,00 | 133.513,00 | 41,00 | 0,00 |
| 2025-12 | 3.098 | 3.095 | 143.047,00 | 143.047,00 | 143.047,00 | 0,00 | 0,00 |
| 2026-01 | 3.196 | 3.194 | 140.858,00 | 140.858,00 | 140.858,00 | 0,00 | 0,00 |
| 2026-02 | 2.703 | 2.703 | 120.400,00 | 120.400,00 | 120.400,00 | 0,00 | 0,00 |
| 2026-03 | 3.142 | 3.141 | 137.565,00 | 137.565,00 | 137.565,00 | 0,00 | 0,00 |
| 2026-04 | 3.081 | 3.078 | 135.516,00 | 135.516,00 | 135.413,00 | 103,00 | 0,00 |
| 2026-05 | 3.155 | 3.152 | 137.390,00 | 137.390,00 | 137.302,00 | 88,00 | 0,00 |
| 2026-06 | 3.283 | 3.278 | 141.214,00 | 141.214,00 | 141.143,00 | 71,00 | 0,00 |
| 2026-07 | 3.479 | 3.468 | 150.985,00 | 150.985,00 | 150.985,00 | 0,00 | 0,00 |
| 2026-08 | 3.579 | 3.568 | 162.176,00 | 162.176,00 | 162.131,00 | 45,00 | 0,00 |
| 2026-09 | 587 | 587 | 24.596,00 | 24.596,00 | 24.488,00 | 108,00 | 0,00 |

### 3.3 Distribución por estado y forma de pago

| Concepto | Ventas | Total (Bs.) |
|---|---|---|
| Estado factura: ANULADO | 1.760 | 0,00 |
| Estado factura: VÁLIDO | 169.979 | 6.747.503,00 |
| Estado pago: CANCELADO | 171.727 | 6.747.419,00 |
| Estado pago: PENDIENTE | 12 | 84,00 |
| Forma de pago: AL CONTADO | 171.727 | 6.747.419,00 |
| Forma de pago: CREDITO | 12 | 84,00 |
| Tipo factura: 0 | 171.739 | 6.747.503,00 |
| Emisión: Con factura | 7 | 266,00 |
| Emisión: Sin factura | 171.732 | 6.747.237,00 |

### 3.4 Responsables de venta

| Responsable | Ventas | Total (Bs.) | Participación |
|---|---|---|---|
| andres padilla rojas | 107.532 | 3.789.010,00 | 56.2% |
| aaa bbb ccc | 46.173 | 2.215.124,00 | 32.8% |
| yan karla cordova padilla | 4.865 | 188.404,00 | 2.8% |
| 654321 a a | 2.864 | 137.230,00 | 2.0% |
| ever cuellar claros | 2.779 | 114.173,00 | 1.7% |
| robin ruiz nogales | 1.995 | 70.165,00 | 1.0% |
| Enrique Elio Marin | 1.370 | 60.541,00 | 0.9% |
| jose antonio flores guasania | 839 | 35.226,00 | 0.5% |
| Veronica Quiroga Del Rio | 955 | 35.085,00 | 0.5% |
| alex marulanda salgado | 474 | 23.681,00 | 0.4% |
| Robin Ruiz Nogales | 445 | 16.862,00 | 0.2% |
| Geraldinne Salazar Nogales | 365 | 16.514,00 | 0.2% |
| Denilson Rojas carranza | 188 | 10.701,00 | 0.2% |
| denilson rojas carranza | 262 | 9.916,00 | 0.1% |
| Disney Mendoza Eguez | 196 | 7.410,00 | 0.1% |
| eloisa ali guaribana | 102 | 3.946,00 | 0.1% |
| raul raymond romero | 120 | 3.922,00 | 0.1% |
| aaaa aaaaaa aaaaaaaaaaaa | 95 | 3.904,00 | 0.1% |
| Demo | 69 | 3.614,00 | 0.1% |
| alex villareal hurtado | 48 | 1.930,00 | 0.0% |
| aaaa aaaaaa aaaaaaaaaa | 3 | 145,00 | 0.0% |

### 3.5 Turnos y sucursales

| Concepto | Ventas | Total (Bs.) |
|---|---|---|
| Turno: (vacío) | 171.739 | 6.747.503,00 |
| Sucursal: CASA MATRIZ | 171.739 | 6.747.503,00 |

### 3.6 Clientes más frecuentes (por nombre en factura)

| Cliente | Compras | Total (Bs.) |
|---|---|---|
| mesa | 13.799 | 558.510,00 |
| llevar | 5.407 | 199.274,00 |
| mesa 2 | 3.434 | 173.775,00 |
| MESA | 3.507 | 172.773,00 |
| mesa 1 | 4.153 | 156.221,00 |
| mesa 3 | 3.061 | 117.575,00 |
| mesa 4 | 2.058 | 99.997,00 |
| mesa 5 | 2.694 | 94.496,00 |
| yaigo | 2.136 | 84.267,00 |
| mesa 8 | 2.133 | 79.313,00 |
| mesa 10 | 2.160 | 76.411,00 |
| mesa 9 | 1.957 | 70.236,00 |
| LLEVAR | 1.745 | 64.865,00 |
| mesa 6 | 1.698 | 62.982,00 |
| mesa afuera | 1.001 | 51.120,00 |
| beep | 1.067 | 49.926,00 |
| fernando pozo | 760 | 45.726,00 |
| marcela paz | 791 | 42.919,00 |
| deiby | 734 | 36.270,00 |
| diego | 883 | 30.034,00 |

## 4. Productos más vendidos (detalle de venta)

El desglose de productos procede de `ventasdetalle`, considerando **solo ventas válidas**.

- Líneas de detalle totales: **293.428** (unidades: **377.233**)
- Líneas asociadas a ventas válidas: **290.437** (unidades: **373.175**)
- Líneas de ventas anuladas o sin referencia: **2.991**

### 4.1 Top 30 por monto (sales válidas)

| Producto | Líneas | Unidades | Monto (Bs.) |
|---|---|---|---|
| Napolitana POLLO | 10.095 | 12.226 | 436.580,00 |
| Milapizza POLLO | 6.311 | 7.100 | 252.634,00 |
| Milanesa de pollo con pure | 9.506 | 13.852 | 222.668,00 |
| Crocantes | 5.092 | 6.305 | 200.051,00 |
| Picada POLLO | 4.796 | 5.746 | 182.881,00 |
| Barbacoa | 4.041 | 4.597 | 144.154,00 |
| Miel & Mostaza | 3.793 | 4.433 | 138.312,00 |
| Picantes | 3.824 | 4.377 | 136.033,00 |
| Sandwich Clasico | 4.786 | 5.974 | 134.025,00 |
| AMERICANA POLLO | 2.941 | 3.247 | 133.710,00 |
| Milanesa de res | 5.452 | 8.060 | 131.610,00 |
| Clasica POLLO | 3.946 | 4.876 | 127.045,00 |
| Pollo al horno | 5.500 | 7.795 | 123.983,00 |
| Silpancho | 5.023 | 7.176 | 116.786,00 |
| Limonada | 15.083 | 21.371 | 106.855,00 |
| Kepery | 4.209 | 6.107 | 99.253,00 |
| Milañon POLLO | 2.607 | 2.763 | 97.359,00 |
| PIQUE MACHO | 1.297 | 1.409 | 95.775,00 |
| Majadito de charque | 3.576 | 5.233 | 83.831,00 |
| Tortita de carne | 3.512 | 4.970 | 79.462,00 |
| S. pollo a la plancha | 3.229 | 4.107 | 64.897,00 |
| comida china | 2.000 | 2.550 | 63.750,00 |
| Pique macho | 2.563 | 3.569 | 60.462,00 |
| Falso conejo | 2.504 | 3.455 | 55.313,00 |
| Nugget de pollo | 2.452 | 3.423 | 55.026,00 |
| Filete de pollo con MyM | 2.397 | 3.369 | 53.227,00 |
| Revuelto de carne | 2.328 | 3.303 | 52.320,00 |
| Chicharron de pollo | 2.293 | 3.275 | 51.217,00 |
| POLLO | 2.154 | 3.342 | 50.130,00 |
| Tallarin de pollo | 2.237 | 3.054 | 48.926,00 |

### 4.2 Top 30 por unidades (ventas válidas)

| Producto | Líneas | Unidades | Monto (Bs.) |
|---|---|---|---|
| Limonada | 15.083 | 21.371 | 106.855,00 |
| Milanesa de pollo con pure | 9.506 | 13.852 | 222.668,00 |
| Napolitana POLLO | 10.095 | 12.226 | 436.580,00 |
| Bitter | 6.888 | 8.997 | 44.985,00 |
| Milanesa de res | 5.452 | 8.060 | 131.610,00 |
| Pollo al horno | 5.500 | 7.795 | 123.983,00 |
| Silpancho | 5.023 | 7.176 | 116.786,00 |
| Milapizza POLLO | 6.311 | 7.100 | 252.634,00 |
| Crocantes | 5.092 | 6.305 | 200.051,00 |
| Kepery | 4.209 | 6.107 | 99.253,00 |
| Sandwich Clasico | 4.786 | 5.974 | 134.025,00 |
| Picada POLLO | 4.796 | 5.746 | 182.881,00 |
| Majadito de charque | 3.576 | 5.233 | 83.831,00 |
| Tortita de carne | 3.512 | 4.970 | 79.462,00 |
| Clasica POLLO | 3.946 | 4.876 | 127.045,00 |
| Barbacoa | 4.041 | 4.597 | 144.154,00 |
| Acerola | 3.448 | 4.553 | 22.765,00 |
| Miel & Mostaza | 3.793 | 4.433 | 138.312,00 |
| Picantes | 3.824 | 4.377 | 136.033,00 |
| S. pollo a la plancha | 3.229 | 4.107 | 64.897,00 |
| Coca 1 Ltr | 3.744 | 3.802 | 41.584,00 |
| Pique macho | 2.563 | 3.569 | 60.462,00 |
| Falso conejo | 2.504 | 3.455 | 55.313,00 |
| Nugget de pollo | 2.452 | 3.423 | 55.026,00 |
| Filete de pollo con MyM | 2.397 | 3.369 | 53.227,00 |
| POLLO | 2.154 | 3.342 | 50.130,00 |
| Revuelto de carne | 2.328 | 3.303 | 52.320,00 |
| Chicharron de pollo | 2.293 | 3.275 | 51.217,00 |
| AMERICANA POLLO | 2.941 | 3.247 | 133.710,00 |
| RES | 1.974 | 3.156 | 47.340,00 |

### 4.3 Top 30 por monto (todas las líneas)

| Producto | Líneas | Unidades | Monto (Bs.) |
|---|---|---|---|
| Napolitana POLLO | 10.217 | 12.384 | 442.134,00 |
| Milapizza POLLO | 6.400 | 7.212 | 256.557,00 |
| Milanesa de pollo con pure | 9.584 | 13.965 | 224.371,00 |
| Crocantes | 5.149 | 6.371 | 202.051,00 |
| Picada POLLO | 4.861 | 5.830 | 185.431,00 |
| Barbacoa | 4.096 | 4.660 | 146.051,00 |
| Miel & Mostaza | 3.838 | 4.483 | 139.833,00 |
| Picantes | 3.869 | 4.425 | 137.484,00 |
| Sandwich Clasico | 4.848 | 6.054 | 135.870,00 |
| AMERICANA POLLO | 2.978 | 3.289 | 135.410,00 |
| Milanesa de res | 5.507 | 8.148 | 132.930,00 |
| Clasica POLLO | 4.002 | 4.949 | 128.875,00 |
| Pollo al horno | 5.551 | 7.878 | 125.228,00 |
| Silpancho | 5.070 | 7.260 | 118.056,00 |
| Limonada | 15.188 | 21.529 | 107.645,00 |
| Kepery | 4.261 | 6.200 | 100.648,00 |
| Milañon POLLO | 2.642 | 2.801 | 98.695,00 |
| PIQUE MACHO | 1.319 | 1.435 | 97.475,00 |
| Majadito de charque | 3.606 | 5.287 | 84.641,00 |
| Tortita de carne | 3.549 | 5.028 | 80.332,00 |
| S. pollo a la plancha | 3.254 | 4.140 | 65.392,00 |
| comida china | 2.011 | 2.562 | 64.050,00 |
| Pique macho | 2.581 | 3.596 | 60.867,00 |
| Nugget de pollo | 2.485 | 3.483 | 55.926,00 |
| Falso conejo | 2.530 | 3.491 | 55.853,00 |
| Filete de pollo con MyM | 2.418 | 3.400 | 53.692,00 |
| Revuelto de carne | 2.342 | 3.327 | 52.680,00 |
| Chicharron de pollo | 2.316 | 3.311 | 51.757,00 |
| POLLO | 2.160 | 3.356 | 50.340,00 |
| promo NAPO 2X50 | 902 | 995 | 49.750,00 |

## 5. Registro de caja (ingresosalida)

Tabla `ingresosalida`: movimientos de caja (ventas registradas, arqueos y otros).

**Totales globales**

| Métrica | Valor |
|---|---|
| Registros | 165.882 |
| Efectivo registrado (Bs.) | 6.814.431,00 |
| Ingresos (Bs.) | 6.748.344,00 |
| Salidas (Bs.) | 1.885,00 |
| Diferencia neta (Bs.) | 6.746.459,00 |

### 5.1 Totales por año

| Año | Registros | Efectivo (Bs.) | Ingresos (Bs.) | Salidas (Bs.) |
|---|---|---|---|---|
| 2019 | 328 | 25.447,00 | 16.010,00 | 0,00 |
| 2020 | 2.547 | 156.772,00 | 100.122,00 | 1.885,00 |
| 2021 | 19.735 | 825.353,00 | 825.353,00 | 0,00 |
| 2022 | 27.608 | 1.075.317,00 | 1.075.317,00 | 0,00 |
| 2023 | 29.284 | 1.123.053,00 | 1.123.053,00 | 0,00 |
| 2024 | 28.052 | 1.076.784,00 | 1.076.784,00 | 0,00 |
| 2025 | 32.578 | 1.381.153,00 | 1.381.153,00 | 0,00 |
| 2026 | 25.750 | 1.150.552,00 | 1.150.552,00 | 0,00 |

### 5.2 Evolución mensual

| Mes | Registros | Efectivo (Bs.) | Ingresos (Bs.) | Salidas (Bs.) |
|---|---|---|---|---|
| 2019-12 | 328 | 25.447,00 | 16.010,00 | 0,00 |
| 2020-01 | 1.382 | 85.221,00 | 52.876,00 | 0,00 |
| 2020-02 | 1.049 | 65.000,00 | 43.215,00 | 1.885,00 |
| 2020-03 | 116 | 6.551,00 | 4.031,00 | 0,00 |
| 2021-02 | 562 | 25.814,00 | 25.814,00 | 0,00 |
| 2021-03 | 1.637 | 71.098,00 | 71.098,00 | 0,00 |
| 2021-04 | 1.457 | 64.978,00 | 64.978,00 | 0,00 |
| 2021-05 | 1.796 | 79.225,00 | 79.225,00 | 0,00 |
| 2021-06 | 1.671 | 69.936,00 | 69.936,00 | 0,00 |
| 2021-07 | 1.716 | 74.805,00 | 74.805,00 | 0,00 |
| 2021-08 | 1.894 | 78.954,00 | 78.954,00 | 0,00 |
| 2021-09 | 2.296 | 89.341,00 | 89.341,00 | 0,00 |
| 2021-10 | 2.157 | 83.613,00 | 83.613,00 | 0,00 |
| 2021-11 | 2.130 | 85.680,00 | 85.680,00 | 0,00 |
| 2021-12 | 2.419 | 101.909,00 | 101.909,00 | 0,00 |
| 2022-01 | 2.473 | 100.870,00 | 100.870,00 | 0,00 |
| 2022-02 | 1.981 | 77.037,00 | 77.037,00 | 0,00 |
| 2022-03 | 2.927 | 99.259,00 | 99.259,00 | 0,00 |
| 2022-04 | 2.129 | 85.131,00 | 85.131,00 | 0,00 |
| 2022-05 | 2.248 | 91.494,00 | 91.494,00 | 0,00 |
| 2022-06 | 2.120 | 86.409,00 | 86.409,00 | 0,00 |
| 2022-07 | 2.156 | 88.102,00 | 88.102,00 | 0,00 |
| 2022-08 | 2.119 | 82.070,00 | 82.070,00 | 0,00 |
| 2022-09 | 1.974 | 72.857,00 | 72.857,00 | 0,00 |
| 2022-10 | 2.347 | 90.203,00 | 90.203,00 | 0,00 |
| 2022-11 | 2.470 | 94.660,00 | 94.660,00 | 0,00 |
| 2022-12 | 2.664 | 107.225,00 | 107.225,00 | 0,00 |
| 2023-01 | 2.510 | 100.941,00 | 100.941,00 | 0,00 |
| 2023-02 | 2.199 | 88.567,00 | 88.567,00 | 0,00 |
| 2023-03 | 2.256 | 89.565,00 | 89.565,00 | 0,00 |
| 2023-04 | 2.395 | 91.969,00 | 91.969,00 | 0,00 |
| 2023-05 | 2.591 | 98.694,00 | 98.694,00 | 0,00 |
| 2023-06 | 2.489 | 93.434,00 | 93.434,00 | 0,00 |
| 2023-07 | 2.455 | 95.543,00 | 95.543,00 | 0,00 |
| 2023-08 | 2.256 | 81.208,00 | 81.208,00 | 0,00 |
| 2023-09 | 2.345 | 87.613,00 | 87.613,00 | 0,00 |
| 2023-10 | 2.446 | 89.146,00 | 89.146,00 | 0,00 |
| 2023-11 | 2.584 | 97.756,00 | 97.756,00 | 0,00 |
| 2023-12 | 2.758 | 108.617,00 | 108.617,00 | 0,00 |
| 2024-01 | 2.338 | 92.126,00 | 92.126,00 | 0,00 |
| 2024-02 | 2.205 | 85.268,00 | 85.268,00 | 0,00 |
| 2024-03 | 2.540 | 95.774,00 | 95.774,00 | 0,00 |
| 2024-04 | 2.346 | 86.838,00 | 86.838,00 | 0,00 |
| 2024-05 | 2.567 | 101.493,00 | 101.493,00 | 0,00 |
| 2024-06 | 2.516 | 94.171,00 | 94.171,00 | 0,00 |
| 2024-07 | 2.545 | 97.887,00 | 97.887,00 | 0,00 |
| 2024-08 | 2.479 | 93.251,00 | 93.251,00 | 0,00 |
| 2024-09 | 1.929 | 71.212,00 | 71.212,00 | 0,00 |
| 2024-10 | 1.945 | 70.105,00 | 70.105,00 | 0,00 |
| 2024-11 | 2.196 | 84.365,00 | 84.365,00 | 0,00 |
| 2024-12 | 2.446 | 104.294,00 | 104.294,00 | 0,00 |
| 2025-01 | 2.270 | 94.333,00 | 94.333,00 | 0,00 |
| 2025-02 | 1.889 | 76.552,00 | 76.552,00 | 0,00 |
| 2025-03 | 2.467 | 102.228,00 | 102.228,00 | 0,00 |
| 2025-04 | 2.389 | 97.509,00 | 97.509,00 | 0,00 |
| 2025-05 | 2.642 | 106.299,00 | 106.299,00 | 0,00 |
| 2025-06 | 2.673 | 114.350,00 | 114.350,00 | 0,00 |
| 2025-07 | 2.803 | 119.360,00 | 119.360,00 | 0,00 |
| 2025-08 | 3.055 | 130.189,00 | 130.189,00 | 0,00 |
| 2025-09 | 3.088 | 129.836,00 | 129.836,00 | 0,00 |
| 2025-10 | 3.186 | 133.937,00 | 133.937,00 | 0,00 |
| 2025-11 | 3.042 | 133.513,00 | 133.513,00 | 0,00 |
| 2025-12 | 3.074 | 143.047,00 | 143.047,00 | 0,00 |
| 2026-01 | 3.163 | 140.858,00 | 140.858,00 | 0,00 |
| 2026-02 | 2.670 | 120.400,00 | 120.400,00 | 0,00 |
| 2026-03 | 3.086 | 137.565,00 | 137.565,00 | 0,00 |
| 2026-04 | 3.043 | 135.541,00 | 135.541,00 | 0,00 |
| 2026-05 | 3.112 | 137.302,00 | 137.302,00 | 0,00 |
| 2026-06 | 3.200 | 141.227,00 | 141.227,00 | 0,00 |
| 2026-07 | 3.392 | 150.985,00 | 150.985,00 | 0,00 |
| 2026-08 | 3.508 | 162.186,00 | 162.186,00 | 0,00 |
| 2026-09 | 576 | 24.488,00 | 24.488,00 | 0,00 |

### 5.3 Movimientos por descripción

| Descripción | Registros | Ingresos (Bs.) | Salidas (Bs.) |
|---|---|---|---|
| Venta de Productos | 165.872 | 6.748.344,00 | 0,00 |
| Compra de Productos | 10 | 0,00 | 1.885,00 |

## 6. Arqueos de caja

Tabla `arqueo`: cierre diario por turno.

**Totales globales**

| Métrica | Valor |
|---|---|
| Arqueos | 4.222 |
| Suma precio total (Bs.) | 5.692.878,80 |
| Suma costo total (Bs.) | 0,00 |

### 6.1 Totales por año

| Año | Arqueos | Total (Bs.) |
|---|---|---|
| 2020 | 71 | 122.808,80 |
| 2021 | 664 | 1.092.487,00 |
| 2022 | 857 | 1.274.699,00 |
| 2023 | 738 | 1.054.999,00 |
| 2024 | 718 | 892.185,00 |
| 2025 | 704 | 768.454,00 |
| 2026 | 470 | 487.246,00 |

### 6.2 Por responsable

| Responsable | Arqueos | Total (Bs.) |
|---|---|---|
| andres padilla rojas | 1.616 | 2.874.710,00 |
| aaa bbb ccc | 2.116 | 2.060.863,00 |
| yan karla cordova padilla | 127 | 234.319,00 |
| 654321 a a | 82 | 141.748,00 |
| ever cuellar claros | 80 | 140.076,00 |
| Enrique Elio Marin | 29 | 50.912,00 |
| Veronica Quiroga Del Rio | 22 | 41.250,00 |
| jose antonio flores guasania | 26 | 41.116,00 |
| alex marulanda salgado | 24 | 22.576,00 |
| Robin Ruiz Nogales | 12 | 16.939,00 |
| Geraldinne Salazar Nogales | 8 | 14.022,90 |
| denilson rojas carranza | 9 | 13.531,50 |
| eloisa ali guaribana | 3 | 7.130,00 |
| robin ruiz nogales | 42 | 6.916,00 |
| Denilson Rojas carranza | 10 | 6.880,00 |
| Disney Mendoza Eguez | 3 | 5.565,00 |
| raul raymond romero | 3 | 4.383,00 |
| aaaa aaaaaa aaaaaaaaaaaa | 1 | 3.454,00 |
| (sin asignar) | 5 | 2.644,00 |
| alex villareal hurtado | 2 | 2.362,40 |
| Demo | 1 | 1.211,00 |
| aaaa aaaaaa aaaaaaaaaa | 1 | 270,00 |

### 6.3 Por turno

| Turno | Arqueos | Total (Bs.) |
|---|---|---|
| (vacío) | 65 | 169.177,00 |
| Mañana | 2.070 | 3.534.898,40 |
| Noche | 2.017 | 1.876.125,40 |
| Tarde | 68 | 112.413,00 |
| noche | 2 | 265,00 |

### 6.4 Denominaciones contadas (arqueocaja) acumulado

| Denominación | Cantidad acumulada | Importe (Bs.) |
|---|---|---|
| id 2 (Centavos Bolivianos 0,20) | 69 | 13,80 |
| id 3 (Centavos Bolivianos 0,50) | 77 | 38,50 |
| id 4 (Bolivianos 1,00) | 142 | 142,00 |
| id 5 (Bolivianos 2,00) | 150 | 300,00 |
| id 6 (Bolivianos 5,00) | 82 | 410,00 |
| id 7 (Bolivianos 10,00) | 115 | 1.150,00 |
| id 8 (Bolivianos 20,00) | 52 | 1.040,00 |
| id 9 (Bolivianos 50,00) | 51 | 2.550,00 |
| id 10 (Bolivianos 100,00) | 63 | 6.300,00 |
| id 11 (Bolivianos 200,00) | 63 | 12.600,00 |
| id 12 (Bolivianos 200,00) | 164 | 32.800,00 |

Además hay **4.131** idMoneda fuera del rango de la tabla `moneda` con **200.871** unidades contadas (no valorizables).

Total valorizado en arqueocaja: **57.344,30 Bs.** (solo denominaciones conocidas con recuento).

## 7. Usuarios del sistema

| Usuario | Nombre | Cargo | Registro |
|---|---|---|---|
| admin | Administrador Sistema | Admin | 2026-08-25 |
| U001 | Mastersoft Informática s.r.l. | Administrador de Sistemas | 2019-05-09 |
| U002 | Demo | Demo Sistemas | 2019-05-09 |
| U003 | Enrique Elio Marin | - | 2019-12-18 |
| U004 | Geraldinne Salazar Nogales | - | 2019-12-22 |
| U013 | aaa bbb ccc | - | 2021-04-06 |
| U017 | andres padilla rojas | - | 2021-08-20 |
| U018 | ever cuellar claros | - | 2022-01-01 |
| U019 | 654321 a a | - | 2022-06-12 |
| U020 | aaaa aaaaaa aaaaaaaaaa | - | 2023-01-02 |

## 8. Dosificaciones (facturación)

| N° | Nombre | N° Autorización | Límite emisión | Tipo | Rango |
|---|---|---|---|---|---|
| 1 | CASA MATRIZ | 2001004059034 | 01/01/2029 | SFC | 1 |
| 2 | CASA MATRIZ | - | 31/08/2019 | MANUAL | 1 |

**Nota:** la llave de dosificación (campo `llaveDosificacion`) no se muestra por seguridad.

## 9. Productos

| Métrica | Valor |
|---|---|
| Productos (filas) | 613 |
| Productos activos | 343 |
| Precio mínimo (Bs.) | 2,00 |
| Precio máximo (Bs.) | 200,00 |
| Precio medio (Bs.) | 22,15 |

### 9.1 Por categoría

| Categoría | Productos | Precio mín (Bs.) | Precio prom (Bs.) | Precio máx (Bs.) |
|---|---|---|---|---|
| ALMUERZO | 245 | 15,00 | 17,87 | 30,00 |
| EXTRA GRANDE | 25 | 5,00 | 24,16 | 30,00 |
| GRANDE | 23 | 3,00 | 16,61 | 20,00 |
| REFRESCOS | 22 | 5,00 | 5,95 | 15,00 |
| PROMOCIONES | 21 | 0,00 | 39,95 | 65,00 |
| PedidosYa | 18 | 7,00 | 31,22 | 43,00 |
| BD ESPECIALES | 18 | 4,00 | 22,72 | 30,00 |
| COCA | 17 | 3,00 | 11,47 | 20,00 |
| ALITAS | 15 | 35,00 | 40,33 | 70,00 |
| MILANESAS | 15 | 30,00 | 42,27 | 50,00 |
| BD AGUA | 15 | 4,00 | 17,27 | 25,00 |
| CAFE Y MALT | 14 | 6,00 | 16,71 | 25,00 |
| GASEOSAS | 13 | 4,00 | 10,77 | 20,00 |
| BEBIDAS | 13 | 4,00 | 12,46 | 20,00 |
| BD LECHE | 13 | 4,00 | 18,69 | 28,00 |
| CHIFA | 12 | 20,00 | 37,33 | 55,00 |
| BURGER | 12 | 20,00 | 33,75 | 45,00 |
| EXTRAS | 11 | 2,00 | 6,55 | 15,00 |
| RES | 10 | 23,00 | 35,90 | 45,00 |
| POLLO | 10 | 22,00 | 36,80 | 45,00 |
| WAFFLES | 10 | 5,00 | 19,50 | 35,00 |
| DELIVERY | 9 | 7,00 | 22,11 | 70,00 |
| SANDWICH | 7 | 13,00 | 20,43 | 30,00 |
| COMPARTIR | 6 | 75,00 | 113,33 | 200,00 |
| KIDS | 6 | 18,00 | 22,17 | 25,00 |
| ENSALADAS | 5 | 10,00 | 27,00 | 40,00 |
| PIQUEOS | 5 | 8,00 | 27,20 | 45,00 |
| FANTA | 4 | 5,00 | 10,00 | 20,00 |
| POSTRES | 4 | 2,00 | 8,00 | 12,00 |
| LOMOS | 4 | 45,00 | 48,75 | 55,00 |
| HELADOS | 4 | 15,00 | 29,50 | 40,00 |
| SPRITE | 3 | 5,00 | 6,33 | 7,00 |
| POLLOS | 3 | 35,00 | 36,67 | 40,00 |
| CERVEZA | 1 | 15,00 | 15,00 | 15,00 |

### 9.2 Top 25 por precio unitario

| # | Producto | Precio (Bs.) |
|---|---|---|
| 1 | INTERMINABLE | 200,00 |
| 2 | SUPERWING | 110,00 |
| 3 | SUPER MILAS | 110,00 |
| 4 | FIESTA DE HAMBUR | 105,00 |
| 5 | PIQUEMACHO | 80,00 |
| 6 | BURGER WING | 75,00 |
| 7 | Promo yaigo 2 NAPO+coca 2ltrs | 70,00 |
| 8 | Mixtas 12 uds | 70,00 |
| 9 | Promo Mila 2x65 | 65,00 |
| 10 | promo NAPO 2X60 | 60,00 |
| 11 | promo  PIZZA 2X60 | 60,00 |
| 12 | Promo Mixta | 60,00 |
| 13 | promo alitas 2x60 | 60,00 |
| 14 | COSTILLA CERDO. A. | 55,00 |
| 15 | promo mila 2x55 | 55,00 |
| 16 | PROMO ALITAS 2X55 | 55,00 |
| 17 | M+A | 55,00 |
| 18 | Lomo Napolitano | 55,00 |
| 19 | Americana RS | 50,00 |
| 20 | 4 Quesos RS | 50,00 |
| 21 | Lomo al Champiñon | 50,00 |
| 22 | AMERICANA POLLO | 45,00 |
| 23 | CHICHARRON DE POLLO | 45,00 |
| 24 | POLLO CON CHAMPIÑONES | 45,00 |
| 25 | CARNE CON BROCOLI | 45,00 |

### 9.3 Categorías existentes (tabla `categoria`)

ALITAS, ALMUERZO, BD AGUA, BD ESPECIALES, BD LECHE, BEBIDAS, BURGER, CAFE Y MALT, CERVEZA, CHIFA, COCA, COMPARTIR, DELIVERY, ENSALADAS, EXTRA GRANDE, EXTRAS, FANTA, GASEOSAS, GRANDE, HELADOS, KIDS, LOMOS, MILANESAS, PIQUEOS, POLLO, POLLOS, POSTRES, PROMOCIONES, PedidosYa, REFRESCOS, RES, SANDWICH, SPRITE, WAFFLES

## 10. Notas y observaciones

- El dump fue generado con **mysqldump (MySQL 5.5.62)** en **latin1**; los acentos pueden aparecer distorsionados (p. ej. `VÁLIDO`).
- La tabla `turno` y `userimage` están **vacías** en el dump.
- La tabla `moneda` incluye dos registros con valor `200` (id 11 y 12).
- Se omitieron las imágenes binarias (`producto.imagen`, `categoria.imagen`, `datos.imgLogo`, `usuarios.imgFoto`) del análisis.
- La llave de dosificación y las contraseñas de usuarios no se muestran por seguridad.
- El campo `nombreFactura` no refleja clientes reales: en la mayoría registra `mesa`, `mesa N`, `llevar` etc. (sección 3.6).
- La tabla `arqueocaja` contiene idMoneda fuera del rango de `moneda` (1–12), posiblemente por ampliaciones del catálogo de denominaciones.
- Ventas anuladas: **1.760** filas (~1.0 % del total).
- Existen ventas con **saldo pendiente** acumulado (ver sección 3.1).

