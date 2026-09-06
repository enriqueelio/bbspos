const fs = require('fs');
const readline = require('readline');
const path = require('path');

const DIR = __dirname;
const FILE = path.join(DIR, 'bbs Antiguo.sql');
const OUT = path.join(DIR, 'extracto-catalogo-almuerzos.txt');

const TARGETS = ['categoria', 'producto'];
const NULL_COLS = {
  categoria: new Set([10]),
  producto: new Set([23])
};

const structure = {};
const dataBlocks = {};
const rowCount = {};
const ORDER = [];

let curStruct = null;
let curData = null;
let buf = [];

function quote(v) {
  let s = "'";
  for (const ch of v) {
    const code = ch.charCodeAt(0);
    if (ch === '\\') s += '\\\\';
    else if (ch === "'") s += "\\'";
    else if (code === 0) s += '\\0';
    else if (code === 10) s += '\\n';
    else if (code === 13) s += '\\r';
    else if (code === 9) s += '\\t';
    else if (code === 8) s += '\\b';
    else if (code === 26) s += '\\Z';
    else s += ch;
  }
  return s + "'";
}

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
        else if (nxt === 'Z') out += '\x1a';
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

function parseTuplesWithQuoted(body) {
  const tuples = [];
  const n = body.length;
  let i = 0;
  while (i < n) {
    const c = body.charCodeAt(i);
    if (c === 32 || c === 44 || c === 59) { i++; continue; }
    if (c !== 40) { i++; continue; }
    i++;
    const values = [];
    const quoted = [];
    let col = 0;
    while (i < n) {
      const cc = body.charCodeAt(i);
      if (cc === 32) { i++; continue; }
      if (cc === 44) { i++; col++; continue; }
      if (cc === 41) { i++; break; }
      if (cc === 39) {
        const r = readQuoted(body, i, true);
        values.push(r.value);
        quoted.push(true);
        i = r.idx;
      } else {
        let j = i;
        while (j < n) {
          const cj = body.charCodeAt(j);
          if (cj === 44 || cj === 41) break;
          j++;
        }
        values.push(body.slice(i, j));
        quoted.push(false);
        i = j;
      }
    }
    tuples.push({ values, quoted });
  }
  return tuples;
}

function rebuildInsert(table, body) {
  const nullSet = NULL_COLS[table] || new Set();
  const tuples = parseTuplesWithQuoted(body);
  rowCount[table] = (rowCount[table] || 0) + tuples.length;
  const parts = tuples.map((tu) => {
    const inner = tu.quoted.map((isQ, i) => {
      const v = tu.values[i];
      if (v === undefined || nullSet.has(i) || (!isQ && /^null$/i.test(v))) return 'NULL';
      return isQ ? quote(v) : String(v);
    });
    return '(' + inner.join(',') + ')';
  });
  return 'INSERT INTO `' + table + '` VALUES ' + parts.join(',') + ';';
}

const rl = readline.createInterface({
  input: fs.createReadStream(FILE, { encoding: 'utf8' }),
  crlfDelay: Infinity
});

let lineNo = 0;

rl.on('line', (line) => {
  lineNo++;
  const s = line.trim();

  const mStruct = s.match(/^-- Table structure for table `(\w+)`$/);
  if (mStruct) {
    const name = mStruct[1];
    curStruct = TARGETS.includes(name) ? name : null;
    if (curStruct) {
      structure[curStruct] = [line];
      ORDER.push(curStruct);
    }
    return;
  }

  if (curStruct) {
    structure[curStruct].push(line);
    if (/^\/\*!40101 SET character_set_client = @saved_cs_client \*\/;$/.test(s)) curStruct = null;
    return;
  }

  const mLock = s.match(/^LOCK TABLES `(\w+)` WRITE;$/);
  if (mLock && TARGETS.includes(mLock[1])) {
    curData = mLock[1];
    buf = [line];
    return;
  }

  if (curData) {
    const mIns = s.match(/^INSERT INTO `(\w+)` VALUES(.*)$/);
    if (mIns && mIns[1] === curData) {
      let body = mIns[2];
      const semi = body.lastIndexOf(';');
      if (semi >= 0) body = body.slice(0, semi);
      buf.push(rebuildInsert(curData, body));
    } else {
      buf.push(line);
      if (/^UNLOCK TABLES;$/.test(s)) {
        dataBlocks[curData] = buf;
        buf = [];
        curData = null;
      }
    }
  }
});

rl.on('close', () => {
  let out = '';
  out += '-- ============================================================================\n';
  out += '-- Extracto del catalogo del sistema antiguo (Bibosi / LA MILANESA Bibosi - Xpress)\n';
  out += '-- Fuente: bbs Antiguo.sql (mysqldump 10.13, MySQL 5.5.62, contenido UTF-8)\n';
  out += '-- Fecha de generacion: ' + new Date().toISOString().slice(0, 10) + '\n';
  out += '--\n';
  out += '-- Alcance: SOLO catalogo. Se omiten ordenes, transacciones y clientes.\n';
  out += '--   - categoria: secciones y subsecciones del menu\n';
  out += '--   - producto:  platos / productos (la seccion de almuerzos es categoria \"ALMUERZO\")\n';
  out += '--\n';
  out += '-- La columna imagen (longblob) se reemplazo por NULL para mantener el archivo ligero.\n';
  out += '-- ============================================================================\n\n';

  for (const t of ORDER) {
    out += '-- ----------------------------------------------------------------------------\n';
    out += '-- Tabla: `' + t + '` (' + (rowCount[t] || 0) + ' registros)\n';
    out += '-- ----------------------------------------------------------------------------\n\n';
    out += structure[t].join('\n') + '\n\n';
    out += '-- ------------------------------------------------------------\n';
    out += '-- Dumping data for table `' + t + '`\n';
    out += '-- ------------------------------------------------------------\n\n';
    if (dataBlocks[t]) out += dataBlocks[t].join('\n') + '\n';
    out += '\n';
  }

  out += '-- ============================================================================\n';
  out += '-- Resumen del extracto:\n';
  for (const t of ORDER) out += '--   ' + t + ': ' + (rowCount[t] || 0) + ' registros\n';
  out += '-- ============================================================================\n';

  fs.writeFileSync(OUT, out, 'utf8');

  console.log('=== EXTRACTO ===');
  for (const t of ORDER) console.log(t + ': ' + rowCount[t] + ' registros');
  const size = fs.statSync(OUT).size;
  console.log('Archivo: ' + OUT + ' (' + (size / 1024).toFixed(1) + ' KB)');
});