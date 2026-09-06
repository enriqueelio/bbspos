const fs = require('fs');
const readline = require('readline');
const path = require('path');

const DIR = __dirname;
const FILE = path.join(DIR, 'bbs Antiguo.sql');
const OUT = path.join(DIR, 'reporte_bbs_antiguo.md');

const nf = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfi = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 });
const money = (x) => nf.format(Number(x) || 0);
const num = (x) => nfi.format(Number(x) || 0);

const rowCount = {};
const meta = [];
let dbName = '';

const validVentas = new Set();

const monthVentas = {};
const formapagoV = {};
const estfactV = {};
const estadpagoV = {};
const tipoV = {};
const esfacV = {};
const respV = {};
const sucV = {};
const turnoV = {};
const clientesV = {};
let vRows = 0, vRowsValid = 0;
let vTotal = 0, vAcuenta = 0, vSaldo = 0, vIce = 0, vDesc = 0, vIva = 0;
let vTotalValid = 0;
let vMinFecha = '', vMaxFecha = '';

const prodAll = {};
const prodValid = {};
let dRows = 0, dUnidades = 0, dUnidadesValid = 0, dNoValid = 0;

const monthArqueo = {};
const respArqueo = {};
const turnoArqueo = {};
let aRows = 0, aPrecio = 0, aCosto = 0, aMin = '', aMax = '';

const monthCash = {};
const descCash = {};
const userCash = {};
let cRows = 0, cEfectivo = 0, cIngreso = 0, cSalida = 0, cMin = '', cMax = '';

const denom = {};
const monedas = [];

const users = [];
const dosis = [];
const datos = {};
const cats = new Set();

let pCount = 0, pActivos = 0, pSum = 0;
const catProd = {};
const topPrecio = [];
let pMin = Infinity, pMax = -Infinity;

function inc(map, key, deltaV) {
  if (!map[key]) map[key] = { n: 0, v: 0 };
  const e = map[key];
  e.n++;
  e.v += deltaV || 0;
  return e;
}

const K = {};
K['ventas'] = new Set([0, 1, 4, 5, 6, 11, 13, 14, 15, 16, 17, 20, 21, 26, 28, 31, 32]);
K['ventasdetalle'] = new Set([0, 1, 2, 3, 5, 6]);
K['arqueo'] = new Set([1, 2, 3, 4, 7]);
K['arqueocaja'] = new Set([1, 2, 3]);
K['ingresosalida'] = new Set([1, 5, 6, 7, 9, 12]);
K['usuarios'] = new Set([0, 2, 3, 4, 9, 11]);
K['dosificacion'] = new Set([0, 1, 2, 3, 6, 9, 11]);
K['datos'] = new Set([0, 1, 2, 3, 4, 8, 9, 11, 14, 19, 20, 21]);
K['moneda'] = new Set([0, 1, 2, 3]);
K['producto'] = new Set([0, 1, 2, 3, 4, 14]);
K['categoria'] = new Set([1]);
const none = new Set();

function hVentas(t) {
  const fecha = t[1] || '';
  const estadoFactura = t[6];
  const total = Number(t[14]) || 0;
  const m = fecha.slice(0, 7);
  vRows++;
  vTotal += total;
  vAcuenta += Number(t[15]) || 0;
  vSaldo += Number(t[16]) || 0;
  vIce += Number(t[17]) || 0;
  vDesc += Number(t[20]) || 0;
  vIva += Number(t[21]) || 0;
  if (m) {
    if (!monthVentas[m]) monthVentas[m] = { n: 0, total: 0, acuenta: 0, saldo: 0, ice: 0, nv: 0, totalv: 0 };
    const e = monthVentas[m];
    e.n++; e.total += total;
    e.acuenta += Number(t[15]) || 0;
    e.saldo += Number(t[16]) || 0;
    e.ice += Number(t[17]) || 0;
  }
  const f = estadoFactura ? String(estadoFactura) : '';
  inc(estfactV, f || '(vacío)', total);
  inc(formapagoV, t[11] ? String(t[11]) : '(vacío)', total);
  inc(estadpagoV, t[13] ? String(t[13]) : '(vacío)', total);
  inc(tipoV, t[5] ? String(t[5]) : '(vacío)', total);
  const esf = t[4];
  if (esf === 1 || esf === '1' || esf === 'true') inc(esfacV, 'Con factura', total);
  else inc(esfacV, 'Sin factura', total);
  inc(respV, t[28] ? String(t[28]) : '(sin asignar)', total);
  inc(sucV, t[31] ? String(t[31]) : '(vacío)', total);
  inc(turnoV, t[32] ? String(t[32]) : '(vacío)', total);
  const cli = t[26] ? String(t[26]).trim() : '';
  if (cli) inc(clientesV, cli, total);
  const low = f.toLowerCase();
  if (low === 'válido' || low === 'valido' || low === 'valida') {
    vRowsValid++;
    vTotalValid += total;
    validVentas.add(String(t[0]));
    if (m) { monthVentas[m].nv++; monthVentas[m].totalv += total; }
  }
  if (!vMinFecha || fecha < vMinFecha) vMinFecha = fecha;
  if (fecha > vMaxFecha) vMaxFecha = fecha;
}

function hDetalle(t) {
  const idVenta = t[1] ? String(t[1]) : '';
  const desc = t[3] ? String(t[3]).trim() : '(sin descripción)';
  const cantidad = Number(t[5]) || 0;
  const precio = Number(t[6]) || 0;
  const imp = cantidad * precio;
  dRows++;
  dUnidades += cantidad;
  const a = prodAll[desc];
  if (a) { a.n++; a.u += cantidad; a.g += imp; } else prodAll[desc] = { n: 1, u: cantidad, g: imp };
  if (validVentas.has(idVenta)) {
    dUnidadesValid += cantidad;
    const b = prodValid[desc];
    if (b) { b.n++; b.u += cantidad; b.g += imp; } else prodValid[desc] = { n: 1, u: cantidad, g: imp };
  } else {
    dNoValid++;
  }
}

function hArqueo(t) {
  const fecha = t[1] || '';
  const precio = Number(t[3]) || 0;
  const costo = Number(t[2]) || 0;
  aRows++; aPrecio += precio; aCosto += costo;
  inc(turnoArqueo, t[4] ? String(t[4]) : '(vacío)', precio);
  inc(respArqueo, t[7] ? String(t[7]) : '(sin asignar)', precio);
  const m = fecha.slice(0, 7);
  if (m) {
    if (!monthArqueo[m]) monthArqueo[m] = { n: 0, v: 0 };
    monthArqueo[m].n++;
    monthArqueo[m].v += precio;
  }
  if (!aMin || fecha < aMin) aMin = fecha;
  if (fecha > aMax) aMax = fecha;
}

function hCash(t) {
  const fecha = t[1] || '';
  const efectivo = Number(t[5]) || 0;
  const ingreso = Number(t[6]) || 0;
  const salida = Number(t[7]) || 0;
  const desc = t[9] ? String(t[9]) : '';
  cRows++; cEfectivo += efectivo; cIngreso += ingreso; cSalida += salida;
  if (!descCash[desc]) descCash[desc] = { n: 0, en: 0, sa: 0 };
  descCash[desc].n++;
  descCash[desc].en += ingreso;
  descCash[desc].sa += salida;
  if (t[12]) inc(userCash, String(t[12]), ingreso - salida);
  const m = fecha.slice(0, 7);
  if (m) {
    if (!monthCash[m]) monthCash[m] = { n: 0, ef: 0, en: 0, sa: 0 };
    const e = monthCash[m];
    e.n++; e.ef += efectivo; e.en += ingreso; e.sa += salida;
  }
  if (!cMin || fecha < cMin) cMin = fecha;
  if (fecha > cMax) cMax = fecha;
}

function hDenom(t) {
  denom[String(t[1] || '')] = (denom[String(t[1] || '')] || 0) + (Number(t[3]) || 0);
}

function hUser(t) {
  users.push({ id: t[0], nombres: [t[2], t[3], t[4]].filter(Boolean).join(' '), cargo: t[9], fecha: t[11] });
}

function hDosis(t) {
  dosis.push({ id: t[0], fecha: t[1], nombre: t[2], autorizacion: t[3], limite: t[6], tipo: t[9], rango: t[11] });
}

function hDatos(t) {
  if (String(t[0]) === '1') {
    datos.nit = t[1]; datos.nombreEmpresa = t[2]; datos.propietario = t[3]; datos.sucursal = t[4];
    datos.zona = t[8]; datos.ciudad = t[9]; datos.pais = t[11]; datos.telefono = t[14];
    datos.iva = t[19]; datos.it = t[20]; datos.iue = t[21];
  }
}

function hMoneda(t) {
  monedas.push({ id: t[0], valor: t[1], sim: t[2], desc: t[3] });
}

function hCategoria(t) {
  if (t[1]) cats.add(String(t[1]));
}

function hProd(t) {
  const desc = t[1] ? String(t[1]) : '';
  const cat = t[2] ? String(t[2]) : '(sin categoría)';
  const costo = Number(t[3]) || 0;
  const precio = Number(t[4]) || 0;
  const estado = t[14];
  pCount++;
  if (estado === 1 || estado === '1') pActivos++;
  if (precio > 0) {
    if (precio < pMin) pMin = precio;
    if (precio > pMax) pMax = precio;
    pSum += precio;
  }
  if (!catProd[cat]) catProd[cat] = { n: 0, sum: 0, minp: Infinity, maxp: 0 };
  const c = catProd[cat];
  c.n++; c.sum += precio;
  if (precio < c.minp) c.minp = precio;
  if (precio > c.maxp) c.maxp = precio;
  topPrecio.push({ desc: desc || '(sin nombre)', precio });
}

const handlers = {
  ventas: hVentas,
  ventasdetalle: hDetalle,
  arqueo: hArqueo,
  arqueocaja: hDenom,
  ingresosalida: hCash,
  usuarios: hUser,
  dosificacion: hDosis,
  datos: hDatos,
  moneda: hMoneda,
  categoria: hCategoria,
  producto: hProd
};

function readQuoted(txt, i, build) {
  i++;
  let out = '';
  const n = txt.length;
  while (i < n) {
    const c = txt.charCodeAt(i);
    if (c === 92) {
      const nxt = txt[i + 1];
      if (build) {
        if (nxt === '0') out += '\0';
        else if (nxt === 'n') out += '\n';
        else if (nxt === 'r') out += '\r';
        else if (nxt === 't') out += '\t';
        else if (nxt === 'b') out += '\b';
        else out += nxt;
      }
      i += 2;
      continue;
    }
    if (c === 39) return { value: out, idx: i + 1 };
    if (build) out += txt[i];
    i++;
  }
  return { value: out, idx: i };
}

function parseTuples(table, body, handlersMap, keepSets) {
  const keep = keepSets[table] || none;
  const h = handlersMap[table] || null;
  let count = 0;
  const n = body.length;
  let i = 0;
  while (i < n) {
    const c = body.charCodeAt(i);
    if (c === 32 || c === 44 || c === 59) { i++; continue; }
    if (c !== 40) { i++; continue; }
    i++;
    const tuple = [];
    let col = 0;
    while (i < n) {
      const cc = body.charCodeAt(i);
      if (cc === 32) { i++; continue; }
      if (cc === 44) { i++; col++; continue; }
      if (cc === 41) { i++; break; }
      if (cc === 39) {
        const wanted = keep.has(col);
        const r = readQuoted(body, i, wanted);
        tuple.push(wanted ? r.value : null);
        i = r.idx;
      } else {
        let j = i;
        while (j < n) {
          const cj = body.charCodeAt(j);
          if (cj === 44 || cj === 41) break;
          j++;
        }
        const raw = body.slice(i, j);
        tuple.push(/^null$/i.test(raw) ? null : raw);
        i = j;
      }
    }
    count++;
    if (h) h(tuple);
  }
  return count;
}

function sortedKeys(obj) {
  return Object.keys(obj).sort();
}

function wantsNum(name) {
  return Object.prototype.hasOwnProperty.call(datos, name) && datos[name] !== null && datos[name] !== 'NULL';
}

const handlersMap = handlers;
const keepSets = K;

function mdTable(headers, rows) {
  const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  let out = '| ' + headers.map(esc).join(' | ') + ' |\n';
  out += '|' + headers.map(() => '---').join('|') + '|\n';
  for (const r of rows) out += '| ' + r.map(esc).join(' | ') + ' |\n';
  return out;
}

function buildReport() {
  let md = '';

  md += '# Informe de la base de datos antigua — Bibosi (LA MILANESA)\n\n';
  md += 'Reporte generado automáticamente a partir del archivo `bbs Antiguo.sql` (dump de MySQL, charset latin1).\n\n';
  if (dbName) md += '- Base de datos: `' + dbName + '`\n';
  for (const m of meta) md += '- ' + m.replace(/^--\s?/, '') + '\n';
  md += '\n';

  md += '## 1. Resumen general\n\n';
  md += '<details open>\n\n<p>\n\n**Datos de la empresa**\n\n</p>\n\n';
  if (datos.nombreEmpresa) {
    md += mdTable(
      ['Campo', 'Valor'],
      [
        ['Razón social', datos.nombreEmpresa || ''],
        ['NIT', datos.nit || ''],
        ['Propietario', datos.propietario || ''],
        ['Sucursal', datos.sucursal || ''],
        ['Zona', datos.zona || ''],
        ['Ciudad', datos.ciudad || ''],
        ['País', datos.pais || ''],
        ['Teléfono', datos.telefono || ''],
        ['IVA (%)', datos.iva || ''],
        ['IT (%)', datos.it || ''],
        ['IUE (%)', datos.iue || '']
      ]
    );
  }
  md += '\n</details>\n\n';

  md += '**Período de operación detectado**\n\n';
  md += mdTable(
    ['Concepto', 'Desde', 'Hasta'],
    [
      ['Ventas (fecha registro)', vMinFecha || '-', vMaxFecha || '-'],
      ['Arqueos', aMin || '-', aMax || '-'],
      ['Registro de caja (ingresosalida)', cMin || '-', cMax || '-']
    ]
  );
  md += '\n';

  md += '**Totales globales**\n\n';
  md += mdTable(
    ['Métrica', 'Valor'],
    [
      ['Ventas (filas)', num(vRows)],
      ['Ventas válidas (facturadas)', num(vRowsValid)],
      ['Suma total ventas (Bs.)', money(vTotal)],
      ['Suma total ventas válidas (Bs.)', money(vTotalValid)],
      ['Suma cobrado/acuenta (Bs.)', money(vAcuenta)],
      ['Suma saldo pendiente (Bs.)', money(vSaldo)],
      ['ICE facturado (Bs.)', money(vIce)],
      ['Descuentos aplicados (Bs.)', money(vDesc)],
      ['IVA registrado (Bs.)', money(vIva)],
      ['Líneas de detalle de venta', num(dRows)],
      ['Unidades vendidas (detalle)', num(dUnidades)],
      ['Arqueos de caja', num(aRows)],
      ['Registros de caja (ingresosalida)', num(cRows)],
      ['Productos del catálogo', num(pCount)],
      ['Categorías de producto', num(Object.keys(catProd).length)]
    ]
  );
  md += '\n';

  md += '## 2. Volúmenes de datos por tabla\n\n';
  const volRows = Object.keys(rowCount).sort().map((t) => [t, num(rowCount[t])]);
  md += mdTable(['Tabla', 'Filas'], volRows);
  md += '\n';

  md += '## 3. Ventas\n\n';
  md += '### 3.1 Totales por año\n\n';
  const yearV = {};
  for (const mm of sortedKeys(monthVentas)) {
    const y = mm.slice(0, 4);
    const e = monthVentas[mm];
    if (!yearV[y]) yearV[y] = { n: 0, total: 0, acuenta: 0, saldo: 0, ice: 0, nv: 0, totalv: 0 };
    yearV[y].n += e.n;
    yearV[y].total += e.total;
    yearV[y].acuenta += e.acuenta;
    yearV[y].saldo += e.saldo;
    yearV[y].ice += e.ice;
    yearV[y].nv += e.nv;
    yearV[y].totalv += e.totalv;
  }
  const yRows = sortedKeys(yearV).map((y) => {
    const e = yearV[y];
    return [y, num(e.n), num(e.nv), money(e.total), money(e.totalv), money(e.acuenta), money(e.saldo), money(e.ice)];
  });
  md += mdTable(['Año', 'Ventas', 'Válidas', 'Total (Bs.)', 'Total válido (Bs.)', 'Cobrado (Bs.)', 'Saldo (Bs.)', 'ICE (Bs.)'], yRows);
  md += '\n';

  md += '### 3.2 Evolución mensual\n\n';
  const mRows = sortedKeys(monthVentas).map((mm) => {
    const e = monthVentas[mm];
    return [mm, num(e.n), num(e.nv), money(e.total), money(e.totalv), money(e.acuenta), money(e.saldo), money(e.ice)];
  });
  md += mdTable(['Mes', 'Ventas', 'Válidas', 'Total (Bs.)', 'Total válido (Bs.)', 'Cobrado (Bs.)', 'Saldo (Bs.)', 'ICE (Bs.)'], mRows);
  md += '\n';

  md += '### 3.3 Distribución por estado y forma de pago\n\n';
  const distRows = [];
  for (const k of sortedKeys(estfactV)) distRows.push(['Estado factura: ' + k, num(estfactV[k].n), money(estfactV[k].v)]);
  for (const k of sortedKeys(estadpagoV)) distRows.push(['Estado pago: ' + k, num(estadpagoV[k].n), money(estadpagoV[k].v)]);
  for (const k of sortedKeys(formapagoV)) distRows.push(['Forma de pago: ' + k, num(formapagoV[k].n), money(formapagoV[k].v)]);
  for (const k of sortedKeys(tipoV)) distRows.push(['Tipo factura: ' + k, num(tipoV[k].n), money(tipoV[k].v)]);
  for (const k of sortedKeys(esfacV)) distRows.push(['Emisión: ' + k, num(esfacV[k].n), money(esfacV[k].v)]);
  md += mdTable(['Concepto', 'Ventas', 'Total (Bs.)'], distRows);
  md += '\n';

  md += '### 3.4 Responsables de venta\n\n';
  const rResp = Object.entries(respV)
    .filter(([, e]) => e.n > 0)
    .sort((a, b) => b[1].v - a[1].v)
    .map(([k, e]) => [k, num(e.n), money(e.v), (e.v / (vTotal || 1) * 100).toFixed(1) + '%']);
  md += mdTable(['Responsable', 'Ventas', 'Total (Bs.)', 'Participación'], rResp);
  md += '\n';

  md += '### 3.5 Turnos y sucursales\n\n';
  const turnoRows = sortedKeys(turnoV).map((k) => ['Turno: ' + k, num(turnoV[k].n), money(turnoV[k].v)]);
  const sucRows = sortedKeys(sucV).map((k) => ['Sucursal: ' + k, num(sucV[k].n), money(sucV[k].v)]);
  md += mdTable(['Concepto', 'Ventas', 'Total (Bs.)'], turnoRows.concat(sucRows));
  md += '\n';

  md += '### 3.6 Clientes más frecuentes (por nombre en factura)\n\n';
  const cliRows = Object.entries(clientesV)
    .sort((a, b) => b[1].v - a[1].v)
    .slice(0, 20)
    .map(([k, e]) => [k, num(e.n), money(e.v)]);
  md += mdTable(['Cliente', 'Compras', 'Total (Bs.)'], cliRows);
  md += '\n';

  md += '## 4. Productos más vendidos (detalle de venta)\n\n';
  md += 'El desglose de productos procede de `ventasdetalle`, considerando **solo ventas válidas**.\n\n';
  md += '- Líneas de detalle totales: **' + num(dRows) + '** (unidades: **' + num(dUnidades) + '**)\n';
  md += '- Líneas asociadas a ventas válidas: **' + num(dRows - dNoValid) + '** (unidades: **' + num(dUnidadesValid) + '**)\n';
  md += '- Líneas de ventas anuladas o sin referencia: **' + num(dNoValid) + '**\n\n';
  md += '### 4.1 Top 30 por monto (sales válidas)\n\n';
  const topProd = Object.entries(prodValid)
    .sort((a, b) => b[1].g - a[1].g)
    .slice(0, 30)
    .map(([k, e]) => [k, num(e.n), num(e.u), money(e.g)]);
  md += mdTable(['Producto', 'Líneas', 'Unidades', 'Monto (Bs.)'], topProd);
  md += '\n';
  md += '### 4.2 Top 30 por unidades (ventas válidas)\n\n';
  const topProdU = Object.entries(prodValid)
    .sort((a, b) => b[1].u - a[1].u)
    .slice(0, 30)
    .map(([k, e]) => [k, num(e.n), num(e.u), money(e.g)]);
  md += mdTable(['Producto', 'Líneas', 'Unidades', 'Monto (Bs.)'], topProdU);
  md += '\n';

  md += '### 4.3 Top 30 por monto (todas las líneas)\n\n';
  const topAll = Object.entries(prodAll)
    .sort((a, b) => b[1].g - a[1].g)
    .slice(0, 30)
    .map(([k, e]) => [k, num(e.n), num(e.u), money(e.g)]);
  md += mdTable(['Producto', 'Líneas', 'Unidades', 'Monto (Bs.)'], topAll);
  md += '\n';

  md += '## 5. Registro de caja (ingresosalida)\n\n';
  md += 'Tabla `ingresosalida`: movimientos de caja (ventas registradas, arqueos y otros).\n\n';
  md += '**Totales globales**\n\n';
  md += mdTable(
    ['Métrica', 'Valor'],
    [
      ['Registros', num(cRows)],
      ['Efectivo registrado (Bs.)', money(cEfectivo)],
      ['Ingresos (Bs.)', money(cIngreso)],
      ['Salidas (Bs.)', money(cSalida)],
      ['Diferencia neta (Bs.)', money(cIngreso - cSalida)]
    ]
  );
  md += '\n';
  md += '### 5.1 Totales por año\n\n';
  const yearC = {};
  for (const mm of sortedKeys(monthCash)) {
    const y = mm.slice(0, 4);
    const e = monthCash[mm];
    if (!yearC[y]) yearC[y] = { n: 0, ef: 0, en: 0, sa: 0 };
    yearC[y].n += e.n; yearC[y].ef += e.ef; yearC[y].en += e.en; yearC[y].sa += e.sa;
  }
  const cyRows = sortedKeys(yearC).map((y) => {
    const e = yearC[y];
    return [y, num(e.n), money(e.ef), money(e.en), money(e.sa)];
  });
  md += mdTable(['Año', 'Registros', 'Efectivo (Bs.)', 'Ingresos (Bs.)', 'Salidas (Bs.)'], cyRows);
  md += '\n';
  md += '### 5.2 Evolución mensual\n\n';
  const cmRows = sortedKeys(monthCash).map((mm) => {
    const e = monthCash[mm];
    return [mm, num(e.n), money(e.ef), money(e.en), money(e.sa)];
  });
  md += mdTable(['Mes', 'Registros', 'Efectivo (Bs.)', 'Ingresos (Bs.)', 'Salidas (Bs.)'], cmRows);
  md += '\n';
  md += '### 5.3 Movimientos por descripción\n\n';
  const cdRows = Object.entries(descCash)
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 15)
    .map(([k, e]) => [k || '(vacío)', num(e.n), money(e.en), money(e.sa)]);
  md += mdTable(['Descripción', 'Registros', 'Ingresos (Bs.)', 'Salidas (Bs.)'], cdRows);
  md += '\n';

  md += '## 6. Arqueos de caja\n\n';
  md += 'Tabla `arqueo`: cierre diario por turno.\n\n';
  md += '**Totales globales**\n\n';
  md += mdTable(
    ['Métrica', 'Valor'],
    [
      ['Arqueos', num(aRows)],
      ['Suma precio total (Bs.)', money(aPrecio)],
      ['Suma costo total (Bs.)', money(aCosto)]
    ]
  );
  md += '\n';
  md += '### 6.1 Totales por año\n\n';
  const yearA = {};
  for (const mm of sortedKeys(monthArqueo)) {
    const y = mm.slice(0, 4);
    const e = monthArqueo[mm];
    if (!yearA[y]) yearA[y] = { n: 0, v: 0 };
    yearA[y].n += e.n; yearA[y].v += e.v;
  }
  const ayRows = sortedKeys(yearA).map((y) => [y, num(yearA[y].n), money(yearA[y].v)]);
  md += mdTable(['Año', 'Arqueos', 'Total (Bs.)'], ayRows);
  md += '\n';
  md += '### 6.2 Por responsable\n\n';
  const arRows = Object.entries(respArqueo)
    .sort((a, b) => b[1].v - a[1].v)
    .map(([k, e]) => [k, num(e.n), money(e.v)]);
  md += mdTable(['Responsable', 'Arqueos', 'Total (Bs.)'], arRows);
  md += '\n';
  md += '### 6.3 Por turno\n\n';
  const atRows = sortedKeys(turnoArqueo).map((k) => [k, num(turnoArqueo[k].n), money(turnoArqueo[k].v)]);
  md += mdTable(['Turno', 'Arqueos', 'Total (Bs.)'], atRows);
  md += '\n';

  const valorById = {};
  for (const m of monedas) valorById[m.id] = m;
  let arqueoDenomTotal = 0;
  let denOtros = 0;
  let denOtrosCant = 0;
  const denRows = [];
  const denKeys = Object.keys(denom).sort((a, b) => Number(a) - Number(b));
  for (const k of denKeys) {
    const v = Number(denom[k]) || 0;
    if (v <= 0) continue;
    if (valorById[k]) {
      const val = Number(valorById[k].valor) || 0;
      arqueoDenomTotal += val * v;
      denRows.push(['id ' + k + ' (' + valorById[k].desc + ' ' + money(val) + ')', num(v), money(val * v)]);
    } else {
      denOtros++;
      denOtrosCant += v;
    }
  }
  md += '### 6.4 Denominaciones contadas (arqueocaja) acumulado\n\n';
  md += mdTable(['Denominación', 'Cantidad acumulada', 'Importe (Bs.)'], denRows);
  if (denOtros > 0) md += '\nAdemás hay **' + num(denOtros) + '** idMoneda fuera del rango de la tabla `moneda` con **' + num(denOtrosCant) + '** unidades contadas (no valorizables).\n';
  md += '\nTotal valorizado en arqueocaja: **' + money(arqueoDenomTotal) + ' Bs.** (solo denominaciones conocidas con recuento).\n\n';

  md += '## 7. Usuarios del sistema\n\n';
  md += mdTable(['Usuario', 'Nombre', 'Cargo', 'Registro'], users.map((u) => [u.id, u.nombres || '-', u.cargo || '-', u.fecha || '-']));
  md += '\n';

  md += '## 8. Dosificaciones (facturación)\n\n';
  md += mdTable(['N°', 'Nombre', 'N° Autorización', 'Límite emisión', 'Tipo', 'Rango'], dosis.map((d) => [d.id, d.nombre || '-', d.autorizacion || '-', d.limite || '-', d.tipo || '-', d.rango || '-']));
  md += '\n';
  md += '**Nota:** la llave de dosificación (campo `llaveDosificacion`) no se muestra por seguridad.\n\n';

  md += '## 9. Productos\n\n';
  md += mdTable(
    ['Métrica', 'Valor'],
    [
      ['Productos (filas)', num(pCount)],
      ['Productos activos', num(pActivos)],
      ['Precio mínimo (Bs.)', pMin === Infinity ? '-' : money(pMin)],
      ['Precio máximo (Bs.)', pMax === -Infinity ? '-' : money(pMax)],
      ['Precio medio (Bs.)', pSum > 0 ? money(pSum / pCount) : '-']
    ]
  );
  md += '\n';
  md += '### 9.1 Por categoría\n\n';
  const catRows = Object.entries(catProd)
    .sort((a, b) => b[1].n - a[1].n)
    .map(([k, e]) => [k, num(e.n), money(e.minp), money(e.sum / e.n), money(e.maxp)]);
  md += mdTable(['Categoría', 'Productos', 'Precio mín (Bs.)', 'Precio prom (Bs.)', 'Precio máx (Bs.)'], catRows);
  md += '\n';
  md += '### 9.2 Top 25 por precio unitario\n\n';
  const tpRows = topPrecio
    .sort((a, b) => b.precio - a.precio)
    .slice(0, 25)
    .map((p, ix) => [String(ix + 1), p.desc, money(p.precio)]);
  md += mdTable(['#', 'Producto', 'Precio (Bs.)'], tpRows);
  md += '\n';
  md += '### 9.3 Categorías existentes (tabla `categoria`)\n\n';
  const catNames = Array.from(cats).sort();
  md += catNames.length ? catNames.join(', ') + '\n\n' : '-\n\n';

  md += '## 10. Notas y observaciones\n\n';
  md += '- El dump fue generado con **mysqldump (MySQL 5.5.62)** en **latin1**; los acentos pueden aparecer distorsionados (p. ej. `VÁLIDO`).\n';
  md += '- La tabla `turno` y `userimage` están **vacías** en el dump.\n';
  md += '- La tabla `moneda` incluye dos registros con valor `200` (id 11 y 12).\n';
  md += '- Se omitieron las imágenes binarias (`producto.imagen`, `categoria.imagen`, `datos.imgLogo`, `usuarios.imgFoto`) del análisis.\n';
  md += '- La llave de dosificación y las contraseñas de usuarios no se muestran por seguridad.\n';
  md += '- El campo `nombreFactura` no refleja clientes reales: en la mayoría registra `mesa`, `mesa N`, `llevar` etc. (sección 3.6).\n';
  md += '- La tabla `arqueocaja` contiene idMoneda fuera del rango de `moneda` (1–12), posiblemente por ampliaciones del catálogo de denominaciones.\n';
  md += '- Ventas anuladas: **' + num((estfactV['ANULADO'] || { n: 0 }).n) + '** filas (~' + (((estfactV['ANULADO'] || { n: 0 }).n / (vRows || 1)) * 100).toFixed(1) + ' % del total).\n';
  if (vSaldo > 0) md += '- Existen ventas con **saldo pendiente** acumulado (ver sección 3.1).\n';
  md += '\n';

  fs.writeFileSync(OUT, md, 'utf8');

  console.log('=== RESUMEN ===');
  console.log('Filas por tabla:');
  for (const t of Object.keys(rowCount).sort()) console.log('  ' + t + ': ' + rowCount[t]);
  console.log('Ventas: ' + vRows + ' filas, ' + vRowsValid + ' válidas, total ' + vTotal.toFixed(2));
  console.log('Detalle: ' + dRows + ' líneas, unidades ' + dUnidades);
  console.log('Caja: ' + cRows + ' registros');
  console.log('Arqueos: ' + aRows);
  console.log('Productos: ' + pCount);
  console.log('Usuarios: ' + users.length);
  console.log('Reporte escrito en: ' + OUT);
}

const rl = readline.createInterface({
  input: fs.createReadStream(FILE, { encoding: 'utf8' }),
  crlfDelay: Infinity
});

let lineNo = 0;

rl.on('line', (line) => {
  lineNo++;
  if (lineNo <= 80) {
    if (line.startsWith('USE ')) dbName = line.slice(4, line.lastIndexOf(';') > 0 ? line.lastIndexOf(';') : undefined).trim();
    if (line.startsWith('-- MySQL dump') || line.startsWith('-- Dump completed') || line.startsWith('-- Host:') || line.startsWith('-- Server version')) meta.push(line);
  }
  if (!line.startsWith('INSERT INTO `')) return;
  try {
    const endBt = line.indexOf('`', 13);
    if (endBt < 0) return;
    const table = line.slice(13, endBt);
    const vi = line.indexOf('VALUES');
    if (vi < 0) return;
    let body = line.slice(vi + 6);
    const semi = body.lastIndexOf(';');
    if (semi >= 0) body = body.slice(0, semi);
    const cnt = parseTuples(table, body, handlersMap, keepSets);
    rowCount[table] = (rowCount[table] || 0) + cnt;
  } catch (e) {
    console.error('Error en línea ' + lineNo);
    console.error(e);
    process.exit(1);
  }
});

rl.on('close', () => {
  buildReport();
});