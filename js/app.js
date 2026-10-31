/* PAGUU V2 · piloto. Inicio con resumen, Facturas, Presupuestos y Clientes.
   Datos guardados solo en este navegador (localStorage). Datos de prueba inventados. */
(function () {
  'use strict';
  var P = window.PV2;
  var KEY = 'paguuV2.datos.v2', KEY_V1 = 'paguuV2.datos.v1';
  var EMPRESA = { name: 'EMPRESA DEMO PAGUU SL', nif: 'B00000992', address: 'Calle Ficticia 1, 35000 Las Palmas de Gran Canaria (dirección inventada)' };
  var IGICS = [[7, '7 % (general)'], [3, '3 % (reducido)'], [0, '0 % (sin IGIC)'], [9.5, '9,5 %'], [15, '15 %']];
  var ESTADOS = { pendiente: '⏳ Pendiente', aceptado: '✅ Aceptado', rechazado: '❌ Rechazado' };
  var app = document.getElementById('app');
  var borrador = null; // factura o presupuesto que se está haciendo

  // ---------- utilidades ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function euros(n) { return (+n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'; }
  function hoy() { return P.iso(new Date()); }
  function fechaBonita(iso) { if (!iso) return ''; var d = P.fromIso(iso); return d.getDate() + ' de ' + P.MESES[d.getMonth()] + ' de ' + d.getFullYear(); }
  function fechaCorta(iso) { var p = String(iso).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function aviso(txt) {
    var t = document.getElementById('aviso'); t.textContent = txt; t.classList.add('ver');
    clearTimeout(aviso._t); aviso._t = setTimeout(function () { t.classList.remove('ver'); }, 3500);
  }
  function ir(h) { if (location.hash === h) render(); else location.hash = h; }
  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function esF(tipo) { return tipo !== 'presupuesto'; }
  function nombreTipo(tipo, mayus) { var n = esF(tipo) ? 'factura' : 'presupuesto'; return mayus ? n.charAt(0).toUpperCase() + n.slice(1) : n; }
  function lista(tipo) { return esF(tipo) ? D.facturas : D.presupuestos; }
  function ordena(l) { return l.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.number < b.number ? 1 : -1); }); }
  function suma(l) { return P.r2(l.reduce(function (a, f) { return a + f.total; }, 0)); }
  function plural(n, s, p) { return n + ' ' + (n === 1 ? s : p); }

  // ---------- datos ----------
  function semilla() {
    var cl = [
      { id: 'c1', name: 'Frutas Demo SL', nif: 'B00001172', address: 'Mercado Ficticio, puesto 4 (inventado)', phone: '600 000 001', email: 'frutas@ejemplo.test' },
      { id: 'c2', name: 'Bar Ejemplo SL', nif: 'B00002147', address: 'Plaza de Prueba 2 (inventado)', phone: '600 000 002', email: 'bar@ejemplo.test' },
      { id: 'c3', name: 'Ferretería Prueba SL', nif: 'B00003459', address: 'Calle Inventada 10 (inventado)', phone: '600 000 003', email: '' },
      { id: 'c4', name: 'Taller Ficticio SL', nif: 'B00004564', address: 'Polígono Demo, nave 3 (inventado)', phone: '600 000 004', email: 'taller@ejemplo.test' },
      { id: 'c5', name: 'María Ejemplo Pérez', nif: '00000000T', address: 'Calle Simulada 5 (inventado)', phone: '600 000 005', email: '' }
    ];
    var now = new Date(), y = now.getFullYear(), m = now.getMonth();
    function d(mo, da) { var x = new Date(y, m + mo, da); if (x > now) x = new Date(now); return P.iso(x); }
    function hazDoc(r, i, tipo) {
      var c = cl[r[1]];
      var f = { id: (esF(tipo) ? 'demo' : 'pdemo') + (i + 1), tipo: tipo, date: r[0], client: { id: c.id, name: c.name, nif: c.nif, address: c.address },
        lines: r[2].map(function (l) { return { concept: l[0], qty: l[1], price: l[2] }; }), igic: r[3], source: 'demo' };
      return calcula(f);
    }
    var facturas = [];
    [
      [d(-2, 4), 0, [['Cajas de plátanos', 20, 12], ['Sacos de papas', 10, 8.5]], 0],
      [d(-2, 12), 1, [['Refrescos (caja de 24)', 6, 14.4]], 7],
      [d(-2, 21), 3, [['Revisión de furgoneta', 1, 85], ['Aceite de motor', 4, 9.95]], 7],
      [d(-1, 3), 0, [['Cajas de mangos', 8, 18]], 0],
      [d(-1, 9), 2, [['Martillos', 3, 8], ['Caja de tornillos', 5, 4.2]], 7],
      [d(-1, 18), 4, [['Horas de limpieza', 6, 15]], 7],
      [d(-1, 27), 1, [['Botellas de agua', 48, 0.6]], 3],
      [d(0, 2), 0, [['Cajas de plátanos', 15, 12.5], ['Cajas de tomates', 6, 9]], 0],
      [d(0, 7), 3, [['Cambio de neumáticos', 2, 70]], 7],
      [d(0, 15), 2, [['Pintura blanca 15 L', 2, 39.9]], 7],
      [d(0, 22), 1, [['Café en grano (kilo)', 5, 16]], 3]
    ].sort(function (a, b) { return a[0] < b[0] ? -1 : 1; }).forEach(function (r, i) {
      var f = hazDoc(r, i, 'factura'); f.number = P.siguienteNumero(facturas, f.date, 'F'); facturas.push(f);
    });
    var presupuestos = [];
    [
      [d(-1, 5), 3, [['Revisión completa de furgoneta', 1, 120]], 7, 'rechazado'],
      [d(0, 3), 1, [['Café en grano (kilo)', 10, 15.5]], 3, 'pendiente'],
      [d(0, 10), 2, [['Pintura blanca 15 L', 6, 38], ['Rodillos', 4, 6.5]], 7, 'pendiente']
    ].sort(function (a, b) { return a[0] < b[0] ? -1 : 1; }).forEach(function (r, i) {
      var p = hazDoc(r, i, 'presupuesto'); p.estado = r[4]; p.number = P.siguienteNumero(presupuestos, p.date, 'P'); presupuestos.push(p);
    });
    return { version: 2, empresa: EMPRESA, clientes: cl, facturas: facturas, presupuestos: presupuestos };
  }
  function calcula(f) { var t = P.totales(f.lines, f.igic); f.base = t.base; f.tax = t.tax; f.total = t.total; return f; }
  var D;
  function carga() {
    try { D = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { D = null; }
    if (!D || !D.facturas) {
      var v1 = null; try { v1 = JSON.parse(localStorage.getItem(KEY_V1) || 'null'); } catch (e) {}
      D = semilla();
      if (v1 && v1.facturas && v1.facturas.some(function (f) { return f.source !== 'demo'; })) { // se conserva lo que escribió en la versión anterior
        D.clientes = (v1.clientes || []).map(function (c, i) { return { id: 'c' + (i + 1), name: c.name, nif: c.nif || '', address: c.address || '', phone: '', email: '' }; });
        D.facturas = v1.facturas.map(function (f) { f.tipo = 'factura'; return f; });
      }
      guarda();
    }
    D.presupuestos = D.presupuestos || []; D.clientes = D.clientes || [];
  }
  function guarda() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { aviso('No se ha podido guardar en este navegador.'); } }
  function clientePorId(id) { for (var i = 0; i < D.clientes.length; i++) if (D.clientes[i].id === id) return D.clientes[i]; return null; }
  function clientePorNombre(n) {
    var k = P.norm(n).trim(); if (!k) return null;
    for (var i = 0; i < D.clientes.length; i++) if (P.norm(D.clientes[i].name).trim() === k) return D.clientes[i];
    var b = P.buscaCliente(n, D.clientes.map(function (c) { return c.name; }));
    if (b) for (var j = 0; j < D.clientes.length; j++) if (D.clientes[j].name === b) return D.clientes[j];
    return null;
  }
  function clientesOrdenados() { return D.clientes.slice().sort(function (a, b) { return P.norm(a.name) < P.norm(b.name) ? -1 : 1; }); }
  function textoNif(v) {
    v = String(v || '').trim(); if (!v) return '';
    var r = P.validaNif(v);
    return r.ok ? '✔ ' + r.tipo + ' correcto' : '⚠ Revise este número: no parece un NIF, NIE o CIF español correcto.';
  }

  // ---------- voz ----------
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var reco = null;
  function vozDisponible() { return !!SR; }
  var MSG_NO_VOZ = 'Este navegador no deja hablar con el programa. Puede hacerlo todo a mano. Para usar la voz, abra PAGUU con Google Chrome o Microsoft Edge.';
  function escucha(boton, salida, alTerminar) {
    if (!SR) { aviso(MSG_NO_VOZ); return; }
    if (reco) { try { reco.stop(); } catch (e) {} return; }
    reco = new SR();
    reco.lang = 'es-ES'; reco.interimResults = true; reco.continuous = false; reco.maxAlternatives = 1;
    var final = '';
    boton.classList.add('escuchando');
    var lbl = boton.querySelector('span'); var txtOrig = lbl ? lbl.textContent : '';
    if (lbl) lbl.textContent = 'Le escucho… pulse para parar';
    if (salida) salida.textContent = 'Hable ahora…';
    reco.onresult = function (ev) {
      var interim = ''; final = '';
      for (var i = 0; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) final += ev.results[i][0].transcript; else interim += ev.results[i][0].transcript;
      }
      if (salida) salida.textContent = (final + ' ' + interim).trim();
    };
    reco.onerror = function (ev) {
      var m = ev.error === 'not-allowed' || ev.error === 'service-not-allowed' ? 'No hay permiso para usar el micrófono. Pulse el candado de la barra de arriba y permita el micrófono.'
        : ev.error === 'no-speech' ? 'No le he oído. Pulse el micrófono y hable otra vez.' : 'No se ha podido escuchar (' + ev.error + '). Pruebe otra vez o hágalo a mano.';
      aviso(m);
    };
    reco.onend = function () {
      boton.classList.remove('escuchando'); if (lbl) lbl.textContent = txtOrig;
      reco = null;
      if (final.trim()) alTerminar(final.trim());
      else if (salida && salida.textContent === 'Hable ahora…') salida.textContent = '';
    };
    try { reco.start(); } catch (e) { reco = null; boton.classList.remove('escuchando'); aviso('No se ha podido encender el micrófono.'); }
  }
  function habla(txt) {
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(txt.replace(/€/g, 'euros')); u.lang = 'es-ES'; u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  // ---------- INICIO ----------
  function filaDoc(f) {
    var est = !esF(f.tipo) ? '<span class="estado ' + esc(f.estado) + '">' + esc(ESTADOS[f.estado] || '') + '</span>' : '';
    return '<li><button type="button" class="fac" data-id="' + esc(f.id) + '"><span><b>' + esc(f.client.name) + '</b><br>'
      + fechaBonita(f.date) + ' · ' + esc(f.number) + ' ' + est + '</span><span class="imp">' + euros(f.total) + '</span></button></li>';
  }
  function enlazaDocs() { app.querySelectorAll('.fac[data-id]').forEach(function (b) { b.onclick = function () { ir('#/doc/' + b.getAttribute('data-id')); }; }); }
  function pantallaInicio() {
    var h = hoy(), mes = h.slice(0, 7), anyo = h.slice(0, 4);
    var fMes = D.facturas.filter(function (f) { return f.date.slice(0, 7) === mes; });
    var fAnyo = D.facturas.filter(function (f) { return f.date.slice(0, 4) === anyo; });
    var pend = ordena(D.presupuestos.filter(function (p) { return p.estado === 'pendiente'; }));
    var ultimas = ordena(D.facturas).slice(0, 5);
    app.innerHTML = '<h1>Hola. ¿Qué quiere hacer?</h1>'
      + '<div class="big-grid dos-col">'
      + '<a class="big" id="irFactura" href="#/nueva/factura"><span class="ico">🧾</span><span>Nueva factura</span></a>'
      + '<a class="big blanco" id="irPresupuesto" href="#/nueva/presupuesto"><span class="ico">📝</span><span>Nuevo presupuesto</span></a>'
      + '<a class="big blanco" id="irClientes" href="#/clientes"><span class="ico">👥</span><span>Clientes</span></a>'
      + '<a class="big blanco" id="irDocs" href="#/documentos"><span class="ico">📂</span><span>Ver facturas y presupuestos</span></a>'
      + '</div>'
      + '<h2>Lo que he facturado</h2>'
      + '<div class="kpis">'
      + '<div class="kpi" id="kMes">Este mes (' + P.MESES[+mes.slice(5) - 1] + ')<div class="n">' + euros(suma(fMes)) + '</div>' + plural(fMes.length, 'factura', 'facturas') + '</div>'
      + '<div class="kpi" id="kAnyo">Este año (' + anyo + ')<div class="n">' + euros(suma(fAnyo)) + '</div>' + plural(fAnyo.length, 'factura', 'facturas') + '</div>'
      + '<div class="kpi" id="kPend">Presupuestos pendientes<div class="n">' + pend.length + '</div>por ' + euros(suma(pend)) + '</div>'
      + '</div>'
      + '<h2>Últimas facturas</h2>'
      + (ultimas.length ? '<ul class="lista" id="ultimas">' + ultimas.map(filaDoc).join('') + '</ul>' : '<p>Todavía no hay facturas.</p>')
      + '<h2>Presupuestos pendientes</h2>'
      + (pend.length ? '<ul class="lista" id="pendientes">' + pend.slice(0, 5).map(filaDoc).join('') + '</ul>' : '<p>No hay presupuestos pendientes.</p>')
      + '<div class="pie no-print"><p>' + esc(D.empresa.name) + ' · ' + esc(D.empresa.nif) + ' (empresa inventada para la prueba)</p>'
      + '<p>Lo que escriba se guarda solo en este aparato.</p>'
      + '<button type="button" id="reset">Volver a poner los datos de prueba</button></div>';
    enlazaDocs();
    document.getElementById('reset').onclick = function () {
      if (confirm('¿Borrar todo lo escrito y volver a los datos de prueba?')) { localStorage.removeItem(KEY); localStorage.removeItem(KEY_V1); carga(); aviso('Datos de prueba restaurados.'); render(); }
    };
  }

  // ---------- FORMULARIO (factura o presupuesto) ----------
  function nuevoBorrador(tipo, origen) {
    return { tipo: tipo || 'factura', date: hoy(), clientId: '', client: { name: '', nif: '', address: '' }, guardarCliente: true,
      lines: [{ concept: '', qty: 1, price: '' }], igic: 7, source: origen || 'mano', avisos: [] };
  }
  function pantallaFormulario() {
    if (!borrador) borrador = nuevoBorrador('factura');
    var b = borrador, tipo = b.tipo;
    var opcionesIgic = IGICS.map(function (o) { return '<option value="' + o[0] + '"' + (+b.igic === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');
    var opcionesCli = '<option value="">✍️ Cliente nuevo</option>' + clientesOrdenados().map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (b.clientId === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('');
    var titulo = b.source === 'foto' ? 'Revise lo que he leído del albarán' : b.source === 'voz' ? 'Revise lo que he entendido' : (esF(tipo) ? 'Nueva factura' : 'Nuevo presupuesto');
    var html = '<h1>' + titulo + '</h1>';
    if (b.source !== 'mano') html += '<div class="ok">Mire que todo esté bien. Puede cambiar cualquier cosa. Luego pulse <b>Guardar ' + nombreTipo(tipo) + '</b>.</div>';
    (b.avisos || []).forEach(function (a) { html += '<div class="alerta">' + esc(a) + '</div>'; });
    html += '<details class="rapido no-print" id="rapido"><summary>⚡ Rellenar más rápido (si quiere)</summary>'
      + '<p class="ayuda">Puede hacer una foto del albarán o decir la ' + nombreTipo(tipo) + ' en voz alta. No es obligatorio.</p>'
      + '<div class="fila"><a class="btn sec" id="irFoto" href="#/foto">📷 Foto del albarán</a><a class="btn sec" id="irVoz" href="#/voz">🎤 Decirla hablando</a></div></details>'
      + '<form id="fform" autocomplete="off" novalidate>'
      + '<h2>1. Cliente</h2>'
      + '<label for="fsel">¿Para quién es?</label><select id="fsel">' + opcionesCli + '</select>'
      + '<p class="ayuda">Elija un cliente guardado o deje «Cliente nuevo» y escriba sus datos.</p>'
      + '<label for="fcli">Nombre o razón social</label>'
      + '<input id="fcli" value="' + esc(b.client.name) + '" placeholder="Nombre del cliente">'
      + '<label for="fnif">NIF, NIE o CIF <span style="font-weight:400">(si lo tiene)</span></label>'
      + '<input id="fnif" value="' + esc(b.client.nif) + '" placeholder="Ejemplo: B00001172" autocapitalize="characters">'
      + '<p class="ayuda" id="nifinfo"></p>'
      + '<label for="fdir">Dirección <span style="font-weight:400">(si quiere)</span></label>'
      + '<input id="fdir" value="' + esc(b.client.address) + '" placeholder="Calle, número, pueblo">'
      + '<label class="check" id="lguardar"' + (b.clientId ? ' hidden' : '') + '><input type="checkbox" id="fguardar"' + (b.guardarCliente ? ' checked' : '') + '> Guardar este cliente para la próxima vez</label>'
      + '<h2>2. Fecha</h2>'
      + '<label for="ffecha">Fecha</label>'
      + '<input id="ffecha" type="date" value="' + esc(b.date) + '"' + (esF(tipo) ? ' max="' + hoy() + '"' : '') + '>'
      + '<p class="ayuda">Si no la cambia, lleva la fecha de hoy.</p>'
      + '<h2>3. ¿Qué le cobra?</h2><div id="lineas"></div>'
      + '<button type="button" class="btn sec full" id="masl">➕ Añadir otra línea</button>'
      + '<label for="figic">IGIC</label><select id="figic">' + opcionesIgic + '</select>'
      + '<div class="totales" id="tot"></div>'
      + '<div class="fila"><button type="submit" class="btn verde full" id="guardar">✅ Guardar ' + nombreTipo(tipo) + '</button></div>'
      + '<div class="fila"><button type="button" class="btn rojo full" id="cancelar">✖ Cancelar</button></div>'
      + '</form>';
    app.innerHTML = html;
    pintaLineas();
    var sel = document.getElementById('fsel'), cli = document.getElementById('fcli'), nif = document.getElementById('fnif'), dir = document.getElementById('fdir');
    function infoNif() { document.getElementById('nifinfo').textContent = textoNif(nif.value); }
    sel.addEventListener('change', function () {
      var c = clientePorId(sel.value);
      b.clientId = c ? c.id : '';
      if (c) { cli.value = c.name; nif.value = c.nif || ''; dir.value = c.address || ''; }
      else { cli.value = ''; nif.value = ''; dir.value = ''; }
      b.client = { name: cli.value, nif: nif.value, address: dir.value };
      document.getElementById('lguardar').hidden = !!c;
      infoNif();
    });
    cli.addEventListener('input', function () { b.client.name = cli.value; });
    nif.addEventListener('input', function () { b.client.nif = nif.value.toUpperCase().replace(/\s/g, ''); infoNif(); });
    dir.addEventListener('input', function () { b.client.address = dir.value; });
    document.getElementById('fguardar').addEventListener('change', function (e) { b.guardarCliente = e.target.checked; });
    document.getElementById('ffecha').addEventListener('change', function (e) { b.date = e.target.value || hoy(); });
    document.getElementById('figic').addEventListener('change', function (e) { b.igic = +e.target.value; pintaTotales(); });
    document.getElementById('masl').onclick = function () { b.lines.push({ concept: '', qty: 1, price: '' }); pintaLineas(); var ins = app.querySelectorAll('.linea input'); ins[ins.length - 3].focus(); };
    document.getElementById('cancelar').onclick = function () { if (confirm('¿Dejar ' + (esF(tipo) ? 'esta factura' : 'este presupuesto') + ' sin guardar?')) { borrador = null; ir('#/'); } };
    document.getElementById('fform').addEventListener('submit', function (e) { e.preventDefault(); guardaDoc(); });
    infoNif();
  }
  function pintaLineas() {
    var b = borrador, cont = document.getElementById('lineas');
    cont.innerHTML = b.lines.map(function (l, i) {
      return '<div class="linea" data-i="' + i + '"><div class="cab"><span>Línea ' + (i + 1) + '</span>'
        + (b.lines.length > 1 ? '<button type="button" class="quitar" data-q="' + i + '">Quitar</button>' : '') + '</div>'
        + '<label for="lc' + i + '">Concepto (¿qué es?)</label><input id="lc' + i + '" data-k="concept" value="' + esc(l.concept) + '" placeholder="Ejemplo: cajas de plátanos">'
        + '<div class="dos"><div><label for="lq' + i + '">Cantidad</label><input id="lq' + i + '" data-k="qty" inputmode="decimal" value="' + esc(numTxt(l.qty)) + '"></div>'
        + '<div><label for="lp' + i + '">Precio de cada uno (€)</label><input id="lp' + i + '" data-k="price" inputmode="decimal" value="' + esc(numTxt(l.price)) + '" placeholder="0,00"></div></div>'
        + '<p class="ayuda" id="li' + i + '"></p></div>';
    }).join('');
    cont.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var i = +inp.closest('.linea').getAttribute('data-i'); b.lines[i][inp.getAttribute('data-k')] = inp.value; pintaTotales();
      });
    });
    cont.querySelectorAll('[data-q]').forEach(function (bt) { bt.onclick = function () { b.lines.splice(+bt.getAttribute('data-q'), 1); pintaLineas(); }; });
    pintaTotales();
  }
  function numTxt(n) { if (n === '' || n == null) return ''; return typeof n === 'number' ? String(n).replace('.', ',') : String(n); }
  function lineasNumericas(lines) { return lines.map(function (l) { return { concept: String(l.concept || '').trim(), qty: P.parseNum(l.qty), price: P.parseNum(l.price) }; }); }
  function pintaTotales() {
    var b = borrador, ls = lineasNumericas(b.lines);
    ls.forEach(function (l, i) { var el = document.getElementById('li' + i); if (el) el.textContent = (!isNaN(l.qty) && !isNaN(l.price)) ? 'Importe: ' + euros(P.r2(l.qty * l.price)) : ''; });
    var t = P.totales(ls.filter(function (l) { return !isNaN(l.qty) && !isNaN(l.price); }), b.igic);
    var el = document.getElementById('tot');
    if (el) el.innerHTML = '<div><span>Base imponible</span><span>' + euros(t.base) + '</span></div><div><span>IGIC ' + String(b.igic).replace('.', ',') + ' %</span><span>' + euros(t.tax) + '</span></div><div class="total"><span>TOTAL</span><span>' + euros(t.total) + '</span></div>';
  }
  function guardaDoc() {
    var b = borrador, tipo = b.tipo;
    var name = document.getElementById('fcli').value.trim();
    var nif = P.limpiaId(document.getElementById('fnif').value);
    var address = document.getElementById('fdir').value.trim();
    var date = document.getElementById('ffecha').value || hoy();
    var ls = lineasNumericas(b.lines).filter(function (l) { return l.concept || !isNaN(l.price); });
    if (!name) { aviso('Falta el nombre del cliente.'); document.getElementById('fcli').focus(); return; }
    if (!ls.length) { aviso('Falta poner qué le cobra.'); return; }
    for (var i = 0; i < ls.length; i++) {
      if (!ls[i].concept) { aviso('Falta el concepto de la línea ' + (i + 1) + '.'); return; }
      if (isNaN(ls[i].qty) || ls[i].qty <= 0) { aviso('Revise la cantidad de la línea ' + (i + 1) + '.'); return; }
      if (isNaN(ls[i].price) || ls[i].price < 0) { aviso('Falta el precio de la línea ' + (i + 1) + '.'); return; }
    }
    if (esF(tipo) && date > hoy()) { aviso('La fecha de la factura no puede ser de un día que todavía no ha llegado.'); return; }
    var c = b.clientId ? clientePorId(b.clientId) : null;
    if (!c) {
      var igual = clientePorNombre(name); if (igual && P.norm(igual.name) === P.norm(name)) c = igual;
    }
    if (!c && b.guardarCliente) { c = { id: uid('c'), name: name, nif: nif, address: address, phone: '', email: '' }; D.clientes.push(c); }
    var f = { id: uid(esF(tipo) ? 'f' : 'p'), tipo: tipo, date: date, client: { id: c ? c.id : '', name: name, nif: nif, address: address },
      lines: ls, igic: +b.igic, source: b.source, createdAt: new Date().toISOString() };
    if (!esF(tipo)) f.estado = 'pendiente';
    f.number = P.siguienteNumero(lista(tipo), date, esF(tipo) ? 'F' : 'P');
    calcula(f);
    lista(tipo).push(f); guarda(); borrador = null;
    aviso(nombreTipo(tipo, true) + ' ' + f.number + ' guardad' + (esF(tipo) ? 'a' : 'o') + '.');
    ir('#/doc/' + f.id + '/nueva');
  }

  // ----- por voz (opcional) -----
  function aplicaCliente(b, nombre) {
    var c = clientePorNombre(nombre);
    if (c) { b.clientId = c.id; b.client = { name: c.name, nif: c.nif || '', address: c.address || '' }; }
    else { b.clientId = ''; b.client = { name: nombre, nif: '', address: '' }; }
  }
  function pantallaVoz() {
    if (!borrador) borrador = nuevoBorrador('factura');
    var tipo = borrador.tipo;
    var html = '<h1>' + nombreTipo(tipo, true) + ' hablando</h1>';
    if (!vozDisponible()) {
      app.innerHTML = html + '<div class="alerta">' + esc(MSG_NO_VOZ) + '</div><a class="btn full" href="#/revisar">✍️ Volver y escribirla a mano</a>';
      return;
    }
    app.innerHTML = html + '<p>Pulse el micrófono y diga para quién es, qué le cobra y, si no es de hoy, la fecha.</p>'
      + '<div class="ejemplo">Por ejemplo:<br><b>«' + (esF(tipo) ? 'Factura' : 'Presupuesto') + ' para Frutas Demo, diez cajas de plátanos a doce euros, fecha ayer»</b></div>'
      + '<button type="button" class="mic" id="mic" aria-label="Pulsar para hablar">🎤<span>Pulse para hablar</span></button>'
      + '<div class="oido" id="oido" aria-live="polite"></div>'
      + '<a class="btn sec full" href="#/revisar">✍️ Prefiero escribirla a mano</a>';
    var mic = document.getElementById('mic'), oido = document.getElementById('oido');
    mic.onclick = function () {
      escucha(mic, oido, function (texto) {
        var r = P.parseVozFactura(texto, hoy());
        var b = borrador;
        b.source = 'voz';
        b.avisos = ['He oído: «' + texto + '»'];
        if (r.client) aplicaCliente(b, r.client);
        if (r.nif) b.client.nif = r.nif;
        if (r.date) b.date = esF(b.tipo) && r.date > hoy() ? hoy() : r.date;
        if (r.igic != null) b.igic = r.igic;
        if (r.lines.length) b.lines = b.lines.filter(function (l) { return l.concept || l.price; }).concat(r.lines);
        if (!r.client) b.avisos.push('No he entendido el cliente. Escríbalo abajo.');
        if (!r.lines.length) b.avisos.push('No he entendido qué le cobra. Escríbalo abajo.');
        ir('#/revisar');
      });
    };
  }

  // ----- por foto del albarán (opcional, OCR) -----
  var TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  function cargaTesseract() {
    return new Promise(function (ok, ko) {
      if (window.Tesseract) return ok(window.Tesseract);
      var s = document.createElement('script'); s.src = TESS; s.onload = function () { ok(window.Tesseract); }; s.onerror = function () { ko(new Error('sin conexión')); };
      document.head.appendChild(s);
    });
  }
  function preparaImagen(file) {
    return new Promise(function (ok, ko) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var max = 2200, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        if (Math.max(w, h) < 1200) k = Math.min(2, 1600 / Math.max(w, h)); // fotos pequeñas: agrandar
        var cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
        var cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, cv.width, cv.height);
        try { // blanco y negro con más contraste
          var d = cx.getImageData(0, 0, cv.width, cv.height), p = d.data;
          for (var i = 0; i < p.length; i += 4) { var g = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; g = Math.max(0, Math.min(255, (g - 128) * 1.4 + 128)); p[i] = p[i + 1] = p[i + 2] = g; }
          cx.putImageData(d, 0, 0);
        } catch (e) {}
        ok({ canvas: cv, url: url });
      };
      img.onerror = function () { ko(new Error('imagen')); };
      img.src = url;
    });
  }
  function pantallaFoto() {
    if (!borrador) borrador = nuevoBorrador('factura');
    app.innerHTML = '<h1>Foto del albarán</h1>'
      + '<p>Ponga el albarán en una mesa, con buena luz y recto. Haga la foto de cerca, que se lean bien las letras.</p>'
      + '<label class="big" for="ffoto" style="margin:0"><span class="ico">📷</span><span>Hacer la foto<small>o elegir una foto que ya tenga</small></span></label>'
      + '<input id="ffoto" type="file" accept="image/*" capture="environment" style="position:absolute;left:-9999px">'
      + '<div id="fest"></div>'
      + '<p style="margin-top:24px"><a class="btn sec full" href="#/revisar">✍️ Prefiero escribirla a mano</a></p>'
      + '<p><button type="button" class="btn sec full" id="fej">🧪 Probar con un albarán de ejemplo</button></p>';
    document.getElementById('ffoto').addEventListener('change', function (e) { var file = e.target.files && e.target.files[0]; if (file) procesaFoto(file); });
    document.getElementById('fej').onclick = function () {
      fetch('albaran-ejemplo.png').then(function (r) { return r.blob(); }).then(procesaFoto).catch(function () { aviso('No se ha podido abrir el ejemplo.'); });
    };
    function procesaFoto(file) {
      var est = document.getElementById('fest');
      est.innerHTML = '<div class="caja"><p id="ftxt"><b>Leyendo el albarán…</b> Espere un momento, puede tardar hasta un minuto.</p><div class="progreso"><div id="fbar"></div></div><img class="foto-prev" id="fprev" alt="Foto del albarán"></div>';
      var bar = document.getElementById('fbar'), txt = document.getElementById('ftxt');
      preparaImagen(file).then(function (im) {
        document.getElementById('fprev').src = im.url;
        return cargaTesseract().then(function (T) {
          return T.recognize(im.canvas, 'spa', { logger: function (m) { if (m && typeof m.progress === 'number') bar.style.width = Math.round((m.status === 'recognizing text' ? 30 + m.progress * 70 : m.progress * 30)) + '%'; } });
        });
      }).then(function (res) {
        bar.style.width = '100%';
        var texto = (res && res.data && res.data.text) || '';
        var r = P.parseAlbaran(texto, { ownNif: D.empresa.nif, ownName: D.empresa.name, hoy: hoy() });
        var b = nuevoBorrador(borrador ? borrador.tipo : 'factura', 'foto');
        if (r.client) aplicaCliente(b, r.client);
        if (r.nif) b.client.nif = r.nif;
        if (r.date && r.date <= hoy()) b.date = r.date;
        if (r.lines.length) b.lines = r.lines;
        b.avisos = r.avisos.slice();
        if (r.number) b.avisos.unshift('Albarán número ' + r.number + '.');
        if (r.total != null && r.lines.length) {
          var t1 = P.totales(r.lines, 7).total, t0 = P.totales(r.lines, 0).total, t3 = P.totales(r.lines, 3).total;
          if (Math.abs(t0 - r.total) < 0.05) b.igic = 0; else if (Math.abs(t3 - r.total) < 0.05) b.igic = 3;
          else if (Math.abs(t1 - r.total) >= 0.05) b.avisos.push('El total del albarán (' + euros(r.total) + ') no coincide con lo leído. Revise las cantidades y precios.');
        }
        b.textoOcr = texto;
        borrador = b;
        ir('#/revisar');
      }).catch(function (err) {
        txt.innerHTML = '<b>No he podido leer la foto.</b> ' + (err && err.message === 'sin conexión' ? 'Hace falta internet para leer fotos.' : 'Pruebe con otra foto con más luz o hágala a mano.');
      });
    }
  }

  // ---------- VER / IMPRIMIR un documento ----------
  function buscaDoc(id) {
    var a = D.facturas.concat(D.presupuestos);
    for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
    return null;
  }
  function hojaDoc(f) {
    var factura = esF(f.tipo);
    var filas = f.lines.map(function (l) { return '<tr><td>' + esc(l.concept) + '</td><td class="r">' + esc(String(l.qty).replace('.', ',')) + '</td><td class="r">' + euros(l.price) + '</td><td class="r">' + euros(P.r2(l.qty * l.price)) + '</td></tr>'; }).join('');
    return '<div class="hoja" id="hoja"><div class="cab2"><div><h1>' + (factura ? 'FACTURA' : 'PRESUPUESTO') + '</h1><div>Número: <b>' + esc(f.number) + '</b></div><div>Fecha: <b>' + fechaCorta(f.date) + '</b></div>'
      + (factura ? '' : '<div>Válido 30 días</div>') + '</div>'
      + '<div style="text-align:right"><b>' + esc(D.empresa.name) + '</b><br>CIF ' + esc(D.empresa.nif) + '<br>' + esc(D.empresa.address) + '</div></div>'
      + '<div style="margin:18px 0;padding:10px 0;border-top:1px solid #000;border-bottom:1px solid #000"><b>Cliente:</b> ' + esc(f.client.name) + (f.client.nif ? ' · NIF/CIF ' + esc(f.client.nif) : '') + (f.client.address ? '<br>' + esc(f.client.address) : '') + '</div>'
      + '<table><thead><tr><th>Concepto</th><th class="r">Cantidad</th><th class="r">Precio</th><th class="r">Importe</th></tr></thead><tbody>' + filas + '</tbody></table>'
      + '<div class="tot"><div><span>Base imponible</span><span>' + euros(f.base) + '</span></div><div><span>IGIC ' + String(f.igic).replace('.', ',') + ' %</span><span>' + euros(f.tax) + '</span></div><div class="g"><span>TOTAL</span><span>' + euros(f.total) + '</span></div></div>'
      + '<p class="nota">' + (factura ? 'Factura' : 'Presupuesto') + ' de PRUEBA del piloto PAGUU V2, con datos inventados. No tiene validez fiscal ni está enviado a Verifactu.</p></div>';
  }
  function pantallaDoc(id, recien) {
    var f = buscaDoc(id);
    if (!f) { app.innerHTML = '<h1>No lo encuentro</h1><a class="btn" href="#/documentos">📂 Ver facturas y presupuestos</a>'; return; }
    var factura = esF(f.tipo), html = '';
    if (recien) html += '<div class="ok no-print" style="font-size:1.3rem">✅ <b>' + nombreTipo(f.tipo, true) + ' guardad' + (factura ? 'a' : 'o') + '.</b> Número ' + esc(f.number) + '.</div>';
    html += '<div class="fila no-print"><button class="btn verde" type="button" id="imp">🖨️ Imprimir o guardar en PDF</button>'
      + '<a class="btn sec" href="#/documentos' + (factura ? '' : '/presupuestos') + '">⬅ Volver a la lista</a></div>';
    if (!factura) {
      var conv = f.facturaId ? buscaDoc(f.facturaId) : null;
      html += '<div class="caja no-print"><b>Estado del presupuesto:</b> <span class="estado ' + esc(f.estado) + '" id="estadoActual">' + esc(ESTADOS[f.estado]) + '</span>'
        + '<div class="fila">' + Object.keys(ESTADOS).map(function (k) { return '<button type="button" class="btn sec' + (f.estado === k ? ' marcado' : '') + '" data-estado="' + k + '">' + ESTADOS[k] + '</button>'; }).join('') + '</div>'
        + (conv ? '<p>Ya está convertido en la factura <a href="#/doc/' + esc(conv.id) + '"><b>' + esc(conv.number) + '</b></a>.</p>'
          : '<button type="button" class="btn full" id="convertir">🧾 Convertir en factura</button>') + '</div>';
    }
    html += hojaDoc(f) + '<div class="fila no-print" style="margin-top:30px"><button class="btn rojo" type="button" id="borrar">🗑 Borrar ' + (factura ? 'esta factura' : 'este presupuesto') + '</button></div>';
    app.innerHTML = html;
    document.getElementById('imp').onclick = function () { window.print(); };
    document.getElementById('borrar').onclick = function () {
      if (confirm('¿Seguro que quiere borrar ' + (factura ? 'la factura ' : 'el presupuesto ') + f.number + '?')) {
        if (factura) D.facturas = D.facturas.filter(function (x) { return x.id !== f.id; });
        else D.presupuestos = D.presupuestos.filter(function (x) { return x.id !== f.id; });
        guarda(); aviso('Borrado.'); ir('#/documentos' + (factura ? '' : '/presupuestos'));
      }
    };
    app.querySelectorAll('[data-estado]').forEach(function (bt) {
      bt.onclick = function () { f.estado = bt.getAttribute('data-estado'); guarda(); aviso('Presupuesto ' + ESTADOS[f.estado].replace(/^\S+\s/, '').toLowerCase() + '.'); render(); };
    });
    var cv = document.getElementById('convertir');
    if (cv) cv.onclick = function () {
      if (!confirm('¿Hacer una factura con este presupuesto? Tendrá la fecha de hoy.')) return;
      var nf = { id: uid('f'), tipo: 'factura', date: hoy(), client: JSON.parse(JSON.stringify(f.client)), lines: JSON.parse(JSON.stringify(f.lines)),
        igic: f.igic, source: 'presupuesto', fromBudget: f.number, createdAt: new Date().toISOString() };
      nf.number = P.siguienteNumero(D.facturas, nf.date, 'F'); calcula(nf);
      D.facturas.push(nf); f.estado = 'aceptado'; f.facturaId = nf.id; guarda();
      aviso('Factura ' + nf.number + ' creada.');
      ir('#/doc/' + nf.id + '/nueva');
    };
  }

  // ---------- LISTA de facturas y presupuestos ----------
  var filtro = { q: '' };
  function aplicaFiltro(l, fl) {
    return l.filter(function (f) {
      if (fl.cliente && f.client.name !== fl.cliente) return false;
      if (fl.from && f.date < fl.from) return false;
      if (fl.to && f.date > fl.to) return false;
      if (fl.q) {
        var k = P.norm(fl.q), hay = P.norm([f.number, f.client.name, f.client.nif, fechaCorta(f.date), f.lines.map(function (l) { return l.concept; }).join(' '), String(f.total).replace('.', ',')].join(' '));
        if (hay.indexOf(k) < 0) return false;
      }
      return true;
    });
  }
  function pantallaDocumentos(pestana) {
    var tipo = pestana === 'presupuestos' ? 'presupuesto' : 'factura';
    var todas = ordena(lista(tipo));
    var html = '<h1>Ver facturas y presupuestos</h1>'
      + '<div class="pestanas" role="tablist"><a role="tab" id="tabF" class="' + (esF(tipo) ? 'activa' : '') + '" href="#/documentos">🧾 Facturas (' + D.facturas.length + ')</a>'
      + '<a role="tab" id="tabP" class="' + (esF(tipo) ? '' : 'activa') + '" href="#/documentos/presupuestos">📝 Presupuestos (' + D.presupuestos.length + ')</a></div>'
      + '<a class="btn full" href="#/nueva/' + tipo + '">➕ ' + (esF(tipo) ? 'Nueva factura' : 'Nuevo presupuesto') + '</a>'
      + '<label for="obus">Buscar (nombre, número o concepto)</label><input id="obus" type="search" value="' + esc(filtro.q) + '" placeholder="Ejemplo: plátanos">';
    if (esF(tipo)) html += '<details class="rapido" id="dpreg"><summary>🎤 Preguntar hablando (si quiere)</summary>'
      + '<p class="ayuda">Por ejemplo: «¿Cuánto facturé en octubre?» o «Facturas de Frutas Demo»</p>'
      + '<button type="button" class="btn verde full" id="preg"><span>🎤 Pulse y pregunte</span></button>'
      + '<div class="oido" id="poido" aria-live="polite" style="min-height:0"></div><div id="presp"></div></details>';
    html += '<div id="ores"></div>';
    app.innerHTML = html;
    function pinta(l, titulo) {
      document.getElementById('ores').innerHTML = '<h2>' + esc(titulo) + '</h2>'
        + '<div class="totales" style="margin:10px 0"><div><span>' + plural(l.length, nombreTipo(tipo), esF(tipo) ? 'facturas' : 'presupuestos') + '</span><span><b>' + euros(suma(l)) + '</b></span></div></div>'
        + (l.length ? '<ul class="lista">' + l.map(filaDoc).join('') + '</ul>' : '<p>No hay nada con eso.</p>');
      enlazaDocs();
    }
    function refresca() { pinta(aplicaFiltro(todas, filtro), filtro.q ? 'Resultado' : (esF(tipo) ? 'Todas las facturas' : 'Todos los presupuestos')); }
    document.getElementById('obus').addEventListener('input', function (e) { filtro.q = e.target.value; refresca(); });
    refresca();
    var preg = document.getElementById('preg');
    if (preg) preg.onclick = function () {
      if (!vozDisponible()) { document.getElementById('presp').innerHTML = '<div class="alerta">' + esc(MSG_NO_VOZ) + ' Use el buscador.</div>'; return; }
      var nombres = []; todas.forEach(function (f) { if (nombres.indexOf(f.client.name) < 0) nombres.push(f.client.name); });
      escucha(preg, document.getElementById('poido'), function (texto) {
        var q = P.parsePregunta(texto, nombres, hoy());
        var l = aplicaFiltro(todas, { cliente: q.client || '', from: q.from, to: q.to });
        var quien = q.client ? ' a ' + q.client : '', cuando = q.label ? ' ' + q.label : '', r;
        if (q.intent === 'last') { var u = l[0]; r = u ? 'La última factura' + quien + ' es la ' + u.number + ', del ' + fechaBonita(u.date) + ', a ' + u.client.name + ', por ' + euros(u.total) + '.' : 'No hay facturas' + quien + '.'; }
        else if (q.intent === 'count') r = 'Ha hecho ' + plural(l.length, 'factura', 'facturas') + quien + cuando + ', por un total de ' + euros(suma(l)) + '.';
        else if (q.intent === 'total') r = 'Ha facturado ' + euros(suma(l)) + quien + cuando + ', en ' + plural(l.length, 'factura', 'facturas') + '.';
        else if (q.client || q.from) r = 'Hay ' + plural(l.length, 'factura', 'facturas') + quien + cuando + ', en total ' + euros(suma(l)) + '. Las tiene abajo.';
        else { r = 'No le he entendido bien. Pruebe: «¿Cuánto facturé en octubre?»'; l = null; }
        document.getElementById('presp').innerHTML = '<div class="respuesta">' + esc(r) + '</div>';
        habla(r);
        if (l) pinta(l, 'Lo que ha preguntado');
      });
    };
  }

  // ---------- CLIENTES ----------
  function pantallaClientes() {
    var cl = clientesOrdenados();
    app.innerHTML = '<h1>Clientes</h1>'
      + '<a class="btn verde full" id="nuevoCli" href="#/cliente/nuevo">➕ Nuevo cliente</a>'
      + '<label for="cbus">Buscar cliente</label><input id="cbus" type="search" placeholder="Nombre o NIF">'
      + '<ul class="lista" id="lclientes"></ul>';
    function pinta(q) {
      var k = P.norm(q || '');
      var l = cl.filter(function (c) { return !k || P.norm(c.name + ' ' + c.nif + ' ' + (c.phone || '')).indexOf(k) >= 0; });
      document.getElementById('lclientes').innerHTML = l.length ? l.map(function (c) {
        return '<li><button type="button" class="fac cli" data-cid="' + esc(c.id) + '"><span><b>' + esc(c.name) + '</b><br>' + esc(c.nif || 'sin NIF') + (c.phone ? ' · ☎ ' + esc(c.phone) : '') + '</span><span class="imp">✏️ Ver</span></button></li>';
      }).join('') : '<li><p>No hay clientes' + (k ? ' con eso' : ' guardados todavía') + '.</p></li>';
      app.querySelectorAll('[data-cid]').forEach(function (b) { b.onclick = function () { ir('#/cliente/' + b.getAttribute('data-cid')); }; });
    }
    document.getElementById('cbus').addEventListener('input', function (e) { pinta(e.target.value); });
    pinta('');
  }
  function pantallaCliente(id) {
    var nuevo = id === 'nuevo', c = nuevo ? { name: '', nif: '', address: '', phone: '', email: '' } : clientePorId(id);
    if (!c) { app.innerHTML = '<h1>No encuentro ese cliente</h1><a class="btn" href="#/clientes">👥 Ver clientes</a>'; return; }
    var nF = nuevo ? 0 : D.facturas.filter(function (f) { return f.client.id === c.id || f.client.name === c.name; }).length;
    function campo(idc, lbl, val, extra) { return '<label for="' + idc + '">' + lbl + '</label><input id="' + idc + '" value="' + esc(val || '') + '"' + (extra || '') + '>'; }
    app.innerHTML = '<h1>' + (nuevo ? 'Nuevo cliente' : esc(c.name)) + '</h1>'
      + (nuevo ? '' : '<p>' + plural(nF, 'factura', 'facturas') + ' hechas a este cliente.</p>')
      + '<form id="cform" autocomplete="off" novalidate>'
      + campo('cnom', 'Nombre o razón social', c.name, ' placeholder="Ejemplo: Frutas Demo SL"')
      + campo('cnif', 'NIF, NIE o CIF <span style="font-weight:400">(si lo tiene)</span>', c.nif, ' placeholder="Ejemplo: B00001172" autocapitalize="characters"')
      + '<p class="ayuda" id="cnifinfo"></p>'
      + campo('cdir', 'Dirección', c.address, ' placeholder="Calle, número, pueblo"')
      + campo('ctel', 'Teléfono', c.phone, ' type="tel" inputmode="tel" placeholder="Ejemplo: 600 000 000"')
      + campo('cmail', 'Email', c.email, ' type="email" inputmode="email" placeholder="Ejemplo: nombre@correo.es"')
      + '<p class="ayuda" id="cmailinfo"></p>'
      + '<div class="fila"><button type="submit" class="btn verde full" id="cguardar">✅ Guardar cliente</button></div>'
      + (nuevo ? '' : '<div class="fila"><button type="button" class="btn full" id="cfactura">🧾 Hacer una factura a este cliente</button></div>'
        + '<div class="fila"><button type="button" class="btn rojo" id="cborrar">🗑 Borrar cliente</button></div>')
      + '<div class="fila"><a class="btn sec full" href="#/clientes">⬅ Volver a clientes</a></div></form>';
    var nif = document.getElementById('cnif'), mail = document.getElementById('cmail');
    function info() {
      document.getElementById('cnifinfo').textContent = textoNif(nif.value);
      document.getElementById('cmailinfo').textContent = mail.value.trim() && !P.validaEmail(mail.value) ? '⚠ Revise el email: no parece correcto.' : '';
    }
    nif.addEventListener('input', info); mail.addEventListener('input', info); info();
    document.getElementById('cform').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('cnom').value.trim(), v = P.limpiaId(nif.value), em = mail.value.trim();
      if (!name) { aviso('Falta el nombre del cliente.'); document.getElementById('cnom').focus(); return; }
      if (v && !P.validaNif(v).ok && !confirm('El NIF/CIF «' + v + '» no parece correcto. ¿Guardarlo igual?')) return;
      if (em && !P.validaEmail(em)) { aviso('Revise el email: no parece correcto.'); mail.focus(); return; }
      var otro = D.clientes.filter(function (x) { return x !== c && P.norm(x.name).trim() === P.norm(name); })[0];
      if (otro) { aviso('Ya hay un cliente con ese nombre.'); return; }
      c.name = name; c.nif = v; c.address = document.getElementById('cdir').value.trim(); c.phone = document.getElementById('ctel').value.trim(); c.email = em;
      if (nuevo) { c.id = uid('c'); D.clientes.push(c); }
      guarda(); aviso('Cliente guardado.'); ir('#/clientes');
    });
    if (!nuevo) {
      document.getElementById('cborrar').onclick = function () {
        if (confirm('¿Borrar el cliente ' + c.name + '? Las facturas ya hechas no se borran.')) { D.clientes = D.clientes.filter(function (x) { return x !== c; }); guarda(); aviso('Cliente borrado.'); ir('#/clientes'); }
      };
      document.getElementById('cfactura').onclick = function () {
        borrador = nuevoBorrador('factura'); borrador.clientId = c.id; borrador.client = { name: c.name, nif: c.nif, address: c.address }; ir('#/revisar');
      };
    }
  }

  // ---------- rutas ----------
  function render() {
    var h = location.hash.replace(/^#\/?/, '').split('/');
    if (reco) { try { reco.abort(); } catch (e) {} reco = null; }
    window.scrollTo(0, 0);
    switch (h[0]) {
      case 'nueva': borrador = nuevoBorrador(h[1] === 'presupuesto' ? 'presupuesto' : 'factura'); pantallaFormulario(); break;
      case 'revisar': pantallaFormulario(); break;
      case 'voz': pantallaVoz(); break;
      case 'foto': pantallaFoto(); break;
      case 'doc': borrador = null; pantallaDoc(h[1], h[2] === 'nueva'); break;
      case 'documentos': borrador = null; pantallaDocumentos(h[1]); break;
      case 'clientes': borrador = null; pantallaClientes(); break;
      case 'cliente': borrador = null; pantallaCliente(h[1]); break;
      default: borrador = null; pantallaInicio();
    }
    app.focus({ preventScroll: true });
  }
  document.getElementById('btnInicio').onclick = function () { borrador = null; ir('#/'); };
  window.addEventListener('hashchange', render);
  carga();
  render();
})();
