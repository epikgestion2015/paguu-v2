/* PAGUU V2 · funciones de lectura (fechas, voz, albaranes, NIF/CIF). Sin dependencias.
   Funciona en el navegador (window.PV2) y en Node (module.exports) para las pruebas. */
(function (root) {
  'use strict';

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'];

  // Quita tildes sin cambiar la longitud del texto (los índices siguen valiendo).
  function sinTildes(s) {
    return String(s || '').replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u').replace(/[ÁÀÄÂ]/g, 'A').replace(/[ÉÈËÊ]/g, 'E')
      .replace(/[ÍÌÏÎ]/g, 'I').replace(/[ÓÒÖÔ]/g, 'O').replace(/[ÚÙÜÛ]/g, 'U');
  }
  function norm(s) { return sinTildes(String(s || '').toLowerCase()); }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromIso(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function validDate(y, m, d) {
    var dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? dt : null;
  }

  // ---------- Números ----------
  // "1.234,56" -> 1234.56 · "12,5" -> 12.5 · "12.50" -> 12.5 · "1.234" -> 1234
  function parseNum(s) {
    if (s == null) return NaN;
    s = String(s).replace(/[€\s]/g, '').replace(/[^\d.,-]/g, '');
    if (!s) return NaN;
    if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (s.indexOf(',') >= 0) {
      var parts = s.split(',');
      if (parts.length > 2) s = parts.join('');
      else s = s.replace(',', '.');
    } else if (s.indexOf('.') >= 0) {
      var ps = s.split('.');
      if (ps.length > 2 || (ps.length === 2 && ps[1].length === 3)) s = ps.join('');
    }
    var n = parseFloat(s);
    return isNaN(n) ? NaN : n;
  }

  var NUM_PAL = {
    cero: 0, un: 1, uno: 1, una: 1, primero: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
    ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
    dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21,
    veintiuno: 21, veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25,
    veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30, cuarenta: 40,
    cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100,
    doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300, cuatrocientos: 400,
    cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600,
    setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900,
    novecientas: 900
  };
  // Convierte números dichos con palabras a cifras: "doce cajas a tres euros" -> "12 cajas a 3 euros".
  function palabrasANumeros(text) {
    var tokens = String(text || '').split(/(\s+|[,;:¿?¡!]+|\.(?=\s|$))/);
    var out = [], i = 0;
    while (i < tokens.length) {
      var t = tokens[i];
      var k = norm(t);
      if (NUM_PAL.hasOwnProperty(k) || (k === 'mil')) {
        var total = 0, cur = 0, j = i, last = i, prevTens = false;
        while (j < tokens.length) {
          var w = norm(tokens[j]);
          if (/^\s+$/.test(tokens[j]) || tokens[j] === '') { j++; continue; }
          if (w === 'mil') { cur = (cur || 1) * 1000; total += cur; cur = 0; last = j; prevTens = false; j++; continue; }
          if (w === 'y' && prevTens) {
            // "treinta y cinco": solo si sigue una unidad
            var n2 = j + 1; while (n2 < tokens.length && /^\s*$/.test(tokens[n2])) n2++;
            var nw = n2 < tokens.length ? norm(tokens[n2]) : '';
            if (NUM_PAL.hasOwnProperty(nw) && NUM_PAL[nw] < 10 && NUM_PAL[nw] > 0) { j++; continue; }
            break;
          }
          if (NUM_PAL.hasOwnProperty(w)) {
            var v = NUM_PAL[w];
            cur += v; prevTens = v >= 20 && v < 100 && v % 10 === 0; last = j; j++; continue;
          }
          break;
        }
        out.push(String(total + cur));
        i = last + 1;
        continue;
      }
      out.push(t);
      i++;
    }
    var s = out.join('');
    // "12 euros con 50" / "12 con 50 céntimos" -> "12,50 euros"; "12 coma 5" -> "12,5"
    s = s.replace(/(\d+)\s*(euros?|€)?\s+con\s+(\d{1,2})(\s*c[eé]ntimos?)?\b/gi, function (m, a, eu, c) {
      return a + ',' + (c.length === 1 ? '0' + c : c) + (eu ? ' euros' : '');
    });
    s = s.replace(/(\d+)\s+coma\s+(\d+)/gi, '$1,$2');
    s = s.replace(/(\d+)\s+(por ciento)/gi, '$1 %');
    return s;
  }

  // ---------- Fechas ----------
  // Busca una fecha dentro de un texto en español. Devuelve {date:'AAAA-MM-DD', match:'texto'} o null.
  function parseFecha(text, hoyIso) {
    var hoy = hoyIso ? fromIso(hoyIso) : new Date();
    hoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    var t = norm(palabrasANumeros(text));
    var m, d;
    function rel(n) { var x = new Date(hoy); x.setDate(x.getDate() + n); return iso(x); }
    function anyo(y, mo, da) {
      // Sin año: el de hoy; si quedaría en el futuro, el año anterior (las facturas no van al futuro).
      if (y) { y = +y; if (y < 100) y += 2000; return y; }
      var cand = validDate(hoy.getFullYear(), mo, da);
      if (cand && cand > hoy) return hoy.getFullYear() - 1;
      return hoy.getFullYear();
    }
    if ((m = t.match(/\b(anteayer|antes de ayer|antier)\b/))) return { date: rel(-2), match: m[0] };
    if ((m = t.match(/\bhace (\d{1,3}) dias?\b/))) return { date: rel(-(+m[1])), match: m[0] };
    var reMes = new RegExp('\\b(?:el\\s+)?(?:dia\\s+)?(\\d{1,2})\\s+de\\s+(' + MESES.join('|') + '|setiembre)(?:\\s+(?:de|del)\\s+(?:ano\\s+)?(\\d{4}))?\\b');
    if ((m = t.match(reMes))) {
      var mo = m[2] === 'setiembre' ? 9 : MESES.indexOf(m[2]) + 1;
      var y = anyo(m[3], mo, +m[1]);
      d = validDate(y, mo, +m[1]);
      if (d) return { date: iso(d), match: m[0] };
    }
    if ((m = t.match(/\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\b/))) {
      var y2 = anyo(m[3], +m[2], +m[1]);
      d = validDate(y2, +m[2], +m[1]);
      if (d) return { date: iso(d), match: m[0] };
    }
    if ((m = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/))) {
      d = validDate(+m[1], +m[2], +m[3]);
      if (d) return { date: iso(d), match: m[0] };
    }
    if ((m = t.match(/\bayer\b/))) return { date: rel(-1), match: m[0] };
    if ((m = t.match(/\bhoy\b/))) return { date: rel(0), match: m[0] };
    // "el día 5" (de este mes)
    if ((m = t.match(/\b(?:el\s+)?dia\s+(\d{1,2})\b/))) {
      var dd = +m[1];
      d = validDate(hoy.getFullYear(), hoy.getMonth() + 1, dd);
      if (d && d > hoy) { var p = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1); d = validDate(p.getFullYear(), p.getMonth() + 1, dd); }
      if (d) return { date: iso(d), match: m[0] };
    }
    return null;
  }

  // ---------- NIF / CIF ----------
  var NIF_RE = /\b([XYZ]\d{7}[A-Z]|\d{8}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J])\b/;
  function limpiaId(s) { return String(s || '').toUpperCase().replace(/[\s.\-\/]/g, ''); }
  // Devuelve {ok, tipo:'NIF'|'NIE'|'CIF'} (solo aviso, nunca bloquea).
  function validaNif(s) {
    var v = limpiaId(s), L = 'TRWAGMYFPDXBNJZSQVHLCKE';
    if (/^\d{8}[A-Z]$/.test(v)) return { ok: L[+v.slice(0, 8) % 23] === v[8], tipo: 'NIF' };
    if (/^[XYZ]\d{7}[A-Z]$/.test(v)) {
      var n = 'XYZ'.indexOf(v[0]) + v.slice(1, 8);
      return { ok: L[+n % 23] === v[8], tipo: 'NIE' };
    }
    if (/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(v)) {
      var dig = v.slice(1, 8), sum = 0;
      for (var i = 0; i < 7; i++) {
        var x = +dig[i];
        if (i % 2 === 0) { x *= 2; x = Math.floor(x / 10) + (x % 10); }
        sum += x;
      }
      var c = (10 - (sum % 10)) % 10, letra = 'JABCDEFGHI'[c], ctrl = v[8];
      var ok = ctrl === String(c) || ctrl === letra;
      if (/[PQRSNW]/.test(v[0])) ok = ctrl === letra;
      if (/[ABEH]/.test(v[0])) ok = ctrl === String(c);
      return { ok: ok, tipo: 'CIF' };
    }
    return { ok: false, tipo: '' };
  }
  function cifControl(letra, siete) { // ayuda para generar datos ficticios válidos
    var sum = 0;
    for (var i = 0; i < 7; i++) { var x = +siete[i]; if (i % 2 === 0) { x *= 2; x = Math.floor(x / 10) + (x % 10); } sum += x; }
    return letra + siete + String((10 - (sum % 10)) % 10);
  }

  function capital(s) { s = String(s || '').trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function titulo(s) {
    return String(s || '').trim().split(/\s+/).map(function (w) {
      if (/^(de|del|la|las|el|los|y|e)$/i.test(w)) return w.toLowerCase();
      if (/^(sl|slu|sa|scp|cb)$/i.test(w.replace(/\./g, ''))) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ').replace(/^./, function (c) { return c.toUpperCase(); });
  }

  // ---------- IGIC ----------
  function parseIgic(t) {
    t = norm(t);
    var m;
    if (/\b(sin igic|exent[oa]|igic (del )?0\b|igic cero)/.test(t)) return { rate: 0, match: (t.match(/sin igic|exent[oa]|igic (del )?0\b|igic cero/) || [''])[0] };
    if ((m = t.match(/\bigic\s+(?:al\s+|del\s+|de\s+)?(\d+(?:[.,]\d+)?)\s*%?/))) return { rate: parseNum(m[1]), match: m[0] };
    if ((m = t.match(/\b(\d+(?:[.,]\d+)?)\s*%?\s+de\s+igic\b/))) return { rate: parseNum(m[1]), match: m[0] };
    if ((m = t.match(/\bigic\s+reducido\b/))) return { rate: 3, match: m[0] };
    if ((m = t.match(/\bigic\s+general\b/))) return { rate: 7, match: m[0] };
    return null;
  }

  // ---------- Factura por voz ----------
  // "Factura para Frutas Demo, 10 cajas de plátanos a 12 euros, fecha ayer"
  function parseVozFactura(text, hoyIso) {
    var res = { client: '', nif: '', date: null, igic: null, lines: [], texto: text };
    var s = palabrasANumeros(String(text || '')).replace(/\s+/g, ' ').trim();
    var f = parseFecha(s, hoyIso);
    var n = norm(s);
    function quita(fragNorm) {
      if (!fragNorm) return;
      var i = n.indexOf(fragNorm);
      if (i >= 0) { s = s.slice(0, i) + ' , ' + s.slice(i + fragNorm.length); n = norm(s); }
    }
    if (f) {
      res.date = f.date;
      // quitar también "fecha", "con fecha", "del" delante de la fecha
      var fi = n.indexOf(f.match);
      var pre = n.slice(0, fi).match(/(?:,?\s*(?:con\s+)?(?:fecha|fechada|del|de)\s*(?:de\s+)?)$/);
      quita((pre ? pre[0] : '') + f.match);
    }
    var ig = parseIgic(n);
    if (ig) { res.igic = ig.rate; quita(ig.match); }
    var mn = n.match(/(?:\bcon\s+(?:el\s+)?)?\b(?:nif|cif|dni|nie)\s*(?:es\s+|numero\s+)?([a-z0-9][a-z0-9 \-]{6,14})/);
    if (mn) {
      var raw = limpiaId(mn[1]);
      var hit = raw.match(/^([XYZ]\d{7}[A-Z]|\d{8}[A-Z]|[A-W]\d{7}[0-9A-J])/);
      if (hit) { res.nif = hit[1]; }
      quita(mn[0]);
    }
    var mc = n.match(/\b(?:para|cliente|al cliente|a nombre de|a)\s+(?:el cliente\s+|la empresa\s+|el\s+|la\s+)?([a-zñ][a-zñ0-9 .&'\-]*?)(?=\s*,|\s*\.\s|\s+(?:de\s+|por\s+|con\s+)?\d|\s+(?:concepto|nif|cif|dni|fecha|igic|sin igic|cantidad|precio)\b|$)/);
    // "a" solo vale si va justo después de "factura"
    if (mc && /^a\s/.test(mc[0]) && !/factura\s+a\s/.test(n)) mc = null;
    if (mc) {
      var start = n.indexOf(mc[1], mc.index);
      res.client = titulo(s.slice(start, start + mc[1].length).replace(/[.,]+$/, ''));
      quita(mc[0]);
    }
    // líneas
    var resto = s.replace(/^\s*(?:,\s*)*(?:haz(?:me)?\s+|hacer\s+|nueva\s+|crea(?:r)?\s+)?(?:una\s+)?factura\b/i, ' ');
    var segs = resto.split(/,\s+|;\s*|\.\s+|\s+y\s+(?=\d)|\s+m[aá]s\s+(?=\d)|\s+otra l[ií]nea\s+/i);
    segs.forEach(function (seg) {
      var g = seg.trim().replace(/^(?:y|de|con|por)\s+/i, '');
      if (!g) return;
      var gn = norm(g), m;
      var NUM = '(\\d+(?:[.,]\\d+)?)';
      // 10 cajas de plátanos a 12 euros
      m = gn.match(new RegExp('^' + NUM + '\\s+(?:de\\s+)?([a-zñ].*?)\\s+(?:a|por|precio(?:\\s+de)?|a razon de|cada (?:una?|una) a)\\s+' + NUM + '\\s*(?:euros?|€)?'));
      if (m) {
        var ci = gn.indexOf(m[2]);
        res.lines.push({ concept: capital(g.slice(ci, ci + m[2].length).replace(/\s+(cada|la unidad)$/i, '')), qty: parseNum(m[1]), price: parseNum(m[3]) });
        return;
      }
      // cantidad 10 / precio 12 / concepto plátanos
      var mq = gn.match(new RegExp('cantidad\\s+(?:de\\s+)?' + NUM)), mp = gn.match(new RegExp('precio\\s+(?:de\\s+)?' + NUM));
      if (mp) {
        var mk = gn.match(/concepto\s+(?:de\s+)?([a-zñ][a-zñ0-9 ]*?)(?=\s+(?:cantidad|precio)\b|$)/);
        var concept = mk ? g.slice(gn.indexOf(mk[1]), gn.indexOf(mk[1]) + mk[1].length)
          : g.replace(/(?:cantidad|precio)\s+(?:de\s+)?\d+(?:[.,]\d+)?\s*(?:euros?|€)?/gi, '').trim();
        res.lines.push({ concept: capital(concept), qty: mq ? parseNum(mq[1]) : 1, price: parseNum(mp[1]) });
        return;
      }
      // reparación del motor por 150 euros  (cantidad 1)
      m = gn.match(new RegExp('^(?:concepto\\s+(?:de\\s+)?)?([a-zñ][a-zñ0-9 ]*?)\\s+(?:por|de|son|vale|a|que cuesta|cuesta)\\s+' + NUM + '\\s*(?:euros?|€)'));
      if (m) {
        var ci2 = gn.indexOf(m[1]);
        res.lines.push({ concept: capital(g.slice(ci2, ci2 + m[1].length)), qty: 1, price: parseNum(m[2]) });
        return;
      }
      // 150 euros de reparación
      m = gn.match(new RegExp('^' + NUM + '\\s*(?:euros?|€)\\s+(?:de|por)\\s+([a-zñ].*)$'));
      if (m) {
        var ci3 = gn.indexOf(m[2]);
        res.lines.push({ concept: capital(g.slice(ci3)), qty: 1, price: parseNum(m[1]) });
      }
    });
    return res;
  }

  // ---------- Preguntas en Operacional ----------
  function claveCliente(nombre) {
    return norm(nombre).replace(/[.,]/g, ' ').replace(/\b(s ?l ?u?|s ?a|sociedad limitada|c ?b)\b/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function buscaCliente(texto, clientes) {
    var t = ' ' + norm(texto).replace(/[.,¿?¡!]/g, ' ').replace(/\s+/g, ' ') + ' ';
    var best = null, bestScore = 0;
    (clientes || []).forEach(function (c) {
      var k = claveCliente(c);
      if (!k) return;
      if (t.indexOf(' ' + k + ' ') >= 0) { var sc = 100 + k.length; if (sc > bestScore) { best = c; bestScore = sc; } return; }
      var ws = k.split(' ').filter(function (w) { return w.length > 2 && !/^(del|las|los|demo|bar|sl)$/.test(w); });
      var hits = ws.filter(function (w) { return t.indexOf(' ' + w + ' ') >= 0; }).length;
      if (hits && hits / ws.length >= 0.5) { var sc2 = hits * 10; if (sc2 > bestScore) { best = c; bestScore = sc2; } }
    });
    return best;
  }
  // Devuelve {intent:'total'|'count'|'list'|'last', from, to, label, client}
  function parsePregunta(texto, clientes, hoyIso) {
    var hoy = hoyIso ? fromIso(hoyIso) : new Date();
    var t = norm(palabrasANumeros(texto)).replace(/ñ/g, 'n').replace(/[¿?¡!]/g, ' ');
    var q = { intent: 'list', from: null, to: null, label: '', client: null };
    if (/\b(cuanto|cuanta plata|total|suma|sumado|importe|dinero|gane|ganado)\b/.test(t)) q.intent = 'total';
    else if (/\bcuantas\b/.test(t)) q.intent = 'count';
    else if (/\b(ultima|ultimo)\b/.test(t)) q.intent = 'last';
    var y = hoy.getFullYear(), m, mi = -1;
    var ym = t.match(/\b(20\d\d)\b/);
    MESES.forEach(function (mes, i) { if (new RegExp('\\b' + mes + '\\b').test(t)) mi = i; });
    if (/\bsetiembre\b/.test(t)) mi = 8;
    function rango(a, b, label) { q.from = iso(a); q.to = iso(b); q.label = label; }
    if (mi >= 0) {
      if (ym) y = +ym[1]; else if (mi > hoy.getMonth()) y = y - 1;
      rango(new Date(y, mi, 1), new Date(y, mi + 1, 0), 'en ' + MESES[mi] + ' de ' + y);
    } else if (/\beste mes\b/.test(t)) {
      rango(new Date(y, hoy.getMonth(), 1), new Date(y, hoy.getMonth() + 1, 0), 'este mes');
    } else if (/\bmes pasado\b/.test(t)) {
      rango(new Date(y, hoy.getMonth() - 1, 1), new Date(y, hoy.getMonth(), 0), 'el mes pasado');
    } else if (/\b(este ano|en el ano)\b/.test(t) || ym) {
      if (ym) y = +ym[1];
      rango(new Date(y, 0, 1), new Date(y, 11, 31), ym ? 'en ' + y : 'este año');
    } else if (/\bano pasado\b/.test(t)) {
      rango(new Date(y - 1, 0, 1), new Date(y - 1, 11, 31), 'el año pasado');
    } else if (/\bhoy\b/.test(t)) {
      rango(hoy, hoy, 'hoy');
    } else if ((m = t.match(/\b(anteayer|ayer)\b/))) {
      var d = new Date(hoy); d.setDate(d.getDate() - (m[1] === 'ayer' ? 1 : 2)); rango(d, d, m[1]);
    } else if (/\besta semana\b/.test(t)) {
      var a = new Date(hoy); a.setDate(a.getDate() - ((a.getDay() + 6) % 7)); rango(a, hoy, 'esta semana');
    }
    q.client = buscaCliente(texto, clientes);
    return q;
  }

  // ---------- Albarán (texto del OCR) ----------
  var CLAVES_TOTAL = /\b(total|subtotal|suma|base imponible|base|igic|iva|i\.g\.i\.c|impuesto|importe total|a pagar|neto|dto|descuento|entregas?)\b/;
  var CLAVES_CABECERA = /\b(albaran|fecha|cliente|n[ºo°]|numero|telefono|tlf|tel|email|e-mail|c\.?p\.?|direccion|nif|cif|dni|pagina|hoja|forma de pago|vencimiento|cantidad\s+(descripcion|concepto)|descripcion\s+cantidad|concepto\s+cantidad|uds|precio\s+importe)\b/;
  function numerosDe(linea) {
    var out = [], re = /(?:^|[\s:x×*€$])(-?\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|-?\d+(?:[.,]\d{1,3})?)(?=$|[\s€%$]|,\s|\.\s)/g, m;
    while ((m = re.exec(linea))) out.push({ raw: m[1], val: parseNum(m[1]), idx: m.index + m[0].indexOf(m[1]) });
    return out;
  }
  function parseAlbaran(texto, opts) {
    opts = opts || {};
    var propio = limpiaId(opts.ownNif || '');
    var res = { client: '', nif: '', date: null, number: '', lines: [], total: null, avisos: [] };
    var lineas = String(texto || '').split(/\r?\n/).map(function (l) { return l.replace(/[|_]+/g, ' ').replace(/\s+/g, ' ').trim(); }).filter(Boolean);
    var full = lineas.join('\n');
    // fecha
    for (var i = 0; i < lineas.length && !res.date; i++) {
      var ln = norm(lineas[i]);
      if (/fecha/.test(ln) || /\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/.test(ln)) {
        var f = parseFecha(lineas[i].replace(/^.*?fecha[^:\d]*:?\s*/i, ''), opts.hoy);
        if (f && (/fecha/.test(ln) || /\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/.test(f.match))) res.date = f.date;
      }
    }
    // número de albarán
    var mnum = norm(full).match(/albaran\s*(?:de\s+(?:entrega|salida|venta)\s*)?(?:n[ºo°.*]*|num(?:ero)?\.?)?\s*:?\s*([a-z]{0,3}[\-\/]?\d[\d\-\/]*)/);
    if (mnum) res.number = mnum[1].toUpperCase();
    // NIF/CIF del cliente (el primero que no sea el nuestro)
    var nifIdx = -1;
    lineas.forEach(function (l, idx) {
      var up = l.toUpperCase().replace(/(\b[A-Z])[\s\-.](?=\d)/g, '$1').replace(/(\d)[\s.\-](?=\d)/g, '$1');
      var re = new RegExp(NIF_RE.source, 'g'), m;
      while ((m = re.exec(up))) {
        if (m[1] !== propio && !res.nif) { res.nif = m[1]; nifIdx = idx; }
      }
    });
    // cliente
    for (var c = 0; c < lineas.length; c++) {
      var nl = norm(lineas[c]);
      var mm = nl.match(/^(?:cliente|destinatario|facturar a|enviar a|sr\.?\/?a?\.?|senor(?:es)?|razon social|nombre)\s*:?\s*(.*)$/);
      if (mm) {
        var v = lineas[c].slice(lineas[c].length - mm[1].length).trim();
        v = v.replace(/\b(nif|cif|dni)\b.*$/i, '').replace(/[:\-–]+$/, '').trim();
        if (v.length < 3 && lineas[c + 1]) v = lineas[c + 1].replace(/\b(nif|cif|dni)\b.*$/i, '').trim();
        if (v && !/^\d+$/.test(v)) { res.client = v; break; }
      }
    }
    if (!res.client && nifIdx >= 0) {
      var linNif = lineas[nifIdx].replace(/\b(nif|cif|dni|nie)\b\s*:?/ig, '').replace(new RegExp(res.nif, 'i'), '').trim();
      if (/[a-zñ]{3,}/i.test(linNif)) res.client = linNif.replace(/[:\-–,]+$/, '').trim();
      else if (nifIdx > 0 && /[a-zñ]{3,}/i.test(lineas[nifIdx - 1])) res.client = lineas[nifIdx - 1];
    }
    if (opts.ownName && res.client && claveCliente(res.client) === claveCliente(opts.ownName)) res.client = '';
    // líneas de producto
    lineas.forEach(function (l) {
      var nl = norm(l);
      if (CLAVES_TOTAL.test(nl) || CLAVES_CABECERA.test(nl)) return;
      if (NIF_RE.test(l.toUpperCase())) return;
      if (/\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/.test(l)) return;
      var nums = numerosDe(l);
      var letras = l.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ]/g, '');
      if (letras.length < 3 || nums.length < 2) return;
      var qty = null, price = null, desc = '';
      var vals = nums.map(function (x) { return x.val; });
      // buscar a × b ≈ c
      outer: for (var a = 0; a < vals.length; a++) for (var b = 0; b < vals.length; b++) {
        if (a === b) continue;
        for (var cc = Math.max(a, b) + 1; cc < vals.length; cc++) {
          if (vals[cc] > 0 && Math.abs(vals[a] * vals[b] - vals[cc]) <= Math.max(0.02, vals[cc] * 0.01)) {
            // la cantidad suele ser el entero / el primero
            if (a < b) { qty = vals[a]; price = vals[b]; } else { qty = vals[b]; price = vals[a]; }
            break outer;
          }
        }
      }
      if (qty == null) {
        // dos números: cantidad y precio (si el primero es entero) o precio e importe iguales
        var ints = nums.filter(function (x) { return /^\d+$/.test(x.raw); });
        if (nums.length >= 2 && ints.length && ints[0] === nums[0]) { qty = nums[0].val; price = nums[1].val; }
        else { qty = 1; price = nums[nums.length - 1].val; }
      }
      // descripción: el texto quitando los números
      desc = l;
      nums.slice().sort(function (x, y) { return y.idx - x.idx; }).forEach(function (x) { desc = desc.slice(0, x.idx) + ' ' + desc.slice(x.idx + x.raw.length); });
      desc = desc.replace(/€|eur\b|uds?\.?\b|unid(ades)?\b|\bx\b/gi, ' ').replace(/^[\s\-–.:,]+|[\s\-–.:,]+$/g, '').replace(/\s+/g, ' ');
      if (!desc || qty <= 0 || price < 0) return;
      res.lines.push({ concept: capital(desc), qty: qty, price: Math.round(price * 100) / 100 });
    });
    var mt = null;
    lineas.forEach(function (l) {
      var nl = norm(l);
      if (/\btotal\b/.test(nl) && !/subtotal|base/.test(nl)) { var ns = numerosDe(l.replace(/(\d)\s+(?=\d{3}\b)/g, '$1')); if (ns.length) mt = ns[ns.length - 1].val; }
    });
    res.total = mt;
    if (!res.lines.length) res.avisos.push('No he podido leer las líneas. Escríbelas a mano.');
    if (!res.client) res.avisos.push('No he encontrado el nombre del cliente.');
    if (!res.date) res.avisos.push('No he encontrado la fecha. Pongo la de hoy.');
    return res;
  }

  // ---------- Cálculo ----------
  function r2(n) { return Math.round((+n || 0) * 100 + 1e-9) / 100; }
  function totales(lines, igic) {
    var base = 0;
    (lines || []).forEach(function (l) { base += r2((+l.qty || 0) * (+l.price || 0)); });
    base = r2(base);
    var tax = r2(base * (+igic || 0) / 100);
    return { base: base, tax: tax, total: r2(base + tax) };
  }
  // Numeración por año: F2026-0001 (facturas) o P2026-0001 (presupuestos).
  function siguienteNumero(docs, fechaIso, prefijo) {
    var pre = prefijo || 'F', y = String(fechaIso || iso(new Date())).slice(0, 4), max = 0;
    var re = new RegExp('^' + pre + '(\\d{4})-(\\d+)$');
    (docs || []).forEach(function (f) {
      var m = String(f.number || '').match(re);
      if (m && m[1] === y) max = Math.max(max, +m[2]);
    });
    var n = String(max + 1); while (n.length < 4) n = '0' + n;
    return pre + y + '-' + n;
  }
  function validaEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim()); }

  var api = {
    MESES: MESES, norm: norm, iso: iso, fromIso: fromIso, parseNum: parseNum, palabrasANumeros: palabrasANumeros,
    parseFecha: parseFecha, validaNif: validaNif, cifControl: cifControl, parseIgic: parseIgic,
    parseVozFactura: parseVozFactura, parsePregunta: parsePregunta, buscaCliente: buscaCliente,
    parseAlbaran: parseAlbaran, totales: totales, siguienteNumero: siguienteNumero, validaEmail: validaEmail, limpiaId: limpiaId, r2: r2, titulo: titulo
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PV2 = api;
})(this);
