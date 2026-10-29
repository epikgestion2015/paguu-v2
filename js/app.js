/* PAGUU V2 · piloto. Interfaz muy sencilla: Facturación y Operacional.
   Datos guardados solo en este navegador (localStorage). Datos de prueba inventados. */
(function () {
  'use strict';
  var P = window.PV2;
  var KEY = 'paguuV2.datos.v1';
  var EMPRESA = { name: 'EMPRESA DEMO PAGUU SL', nif: 'B00000992', address: 'Calle Ficticia 1, 35000 Las Palmas de Gran Canaria (dirección inventada)' };
  var IGICS = [[7, '7 % (general)'], [3, '3 % (reducido)'], [0, '0 % (sin IGIC)'], [9.5, '9,5 %'], [15, '15 %']];
  var app = document.getElementById('app');
  var borrador = null; // factura que se está haciendo

  // ---------- utilidades ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function euros(n) { return (+n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'; }
  function hoy() { return P.iso(new Date()); }
  function fechaBonita(iso) {
    if (!iso) return '';
    var d = P.fromIso(iso);
    return d.getDate() + ' de ' + P.MESES[d.getMonth()] + ' de ' + d.getFullYear();
  }
  function fechaCorta(iso) { var p = String(iso).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function aviso(txt) {
    var t = document.getElementById('aviso'); t.textContent = txt; t.classList.add('ver');
    clearTimeout(aviso._t); aviso._t = setTimeout(function () { t.classList.remove('ver'); }, 3500);
  }
  function ir(h) { if (location.hash === h) render(); else location.hash = h; }

  // ---------- datos ----------
  function semilla() {
    var cl = [
      { name: 'Frutas Demo SL', nif: 'B00001172', address: 'Mercado Ficticio, puesto 4 (inventado)' },
      { name: 'Bar Ejemplo SL', nif: 'B00002147', address: 'Plaza de Prueba 2 (inventado)' },
      { name: 'Ferretería Prueba SL', nif: 'B00003459', address: 'Calle Inventada 10 (inventado)' },
      { name: 'Taller Ficticio SL', nif: 'B00004564', address: 'Polígono Demo, nave 3 (inventado)' },
      { name: 'María Ejemplo Pérez', nif: '00000000T', address: 'Calle Simulada 5 (inventado)' }
    ];
    var now = new Date(), y = now.getFullYear(), m = now.getMonth();
    function d(mo, da) { var x = new Date(y, m + mo, da); if (x > now) x = new Date(now); return P.iso(x); }
    var base = [
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
    ];
    var facturas = [];
    base.sort(function (a, b) { return a[0] < b[0] ? -1 : 1; }).forEach(function (r, i) {
      var c = cl[r[1]];
      var f = { id: 'demo' + (i + 1), date: r[0], client: { name: c.name, nif: c.nif, address: c.address },
        lines: r[2].map(function (l) { return { concept: l[0], qty: l[1], price: l[2] }; }), igic: r[3], source: 'demo' };
      f.number = P.siguienteNumero(facturas, f.date);
      calcula(f); facturas.push(f);
    });
    return { empresa: EMPRESA, clientes: cl, facturas: facturas };
  }
  function calcula(f) { var t = P.totales(f.lines, f.igic); f.base = t.base; f.tax = t.tax; f.total = t.total; return f; }
  var D;
  function carga() {
    try { D = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { D = null; }
    if (!D || !D.facturas) { D = semilla(); guarda(); }
  }
  function guarda() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { aviso('No se ha podido guardar en este navegador.'); } }
  function clientePorNombre(n) {
    var k = P.norm(n).trim();
    for (var i = 0; i < D.clientes.length; i++) if (P.norm(D.clientes[i].name).trim() === k) return D.clientes[i];
    var b = P.buscaCliente(n, D.clientes.map(function (c) { return c.name; }));
    if (b) for (var j = 0; j < D.clientes.length; j++) if (D.clientes[j].name === b) return D.clientes[j];
    return null;
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

  // ---------- pantallas ----------
  function pantallaInicio() {
    app.innerHTML = '<h1>Hola. ¿Qué quiere hacer?</h1>'
      + '<div class="big-grid">'
      + '<a class="big" href="#/facturacion"><span class="ico">🧾</span><span>Facturación<small>Hacer una factura nueva</small></span></a>'
      + '<a class="big verde" href="#/operacional"><span class="ico">📊</span><span>Operacional<small>Ver las facturas que he hecho</small></span></a>'
      + '</div>'
      + '<div class="pie no-print"><p>' + esc(D.empresa.name) + ' · ' + esc(D.empresa.nif) + ' (empresa inventada para la prueba)</p>'
      + '<p>Lo que escriba se guarda solo en este aparato.</p>'
      + '<button type="button" id="reset">Volver a poner los datos de prueba</button></div>';
    document.getElementById('reset').onclick = function () {
      if (confirm('¿Borrar todo lo escrito y volver a los datos de prueba?')) { localStorage.removeItem(KEY); carga(); aviso('Datos de prueba restaurados.'); render(); }
    };
  }

  function pantallaFacturacion() {
    app.innerHTML = '<h1>Factura nueva</h1><p>Elija cómo quiere hacerla:</p>'
      + '<div class="big-grid">'
      + '<a class="big" href="#/nueva/foto"><span class="ico">📷</span><span>Foto del albarán<small>Hago una foto y se rellena sola</small></span></a>'
      + '<a class="big blanco" href="#/nueva/mano"><span class="ico">✍️</span><span>A mano<small>Escribo los datos yo</small></span></a>'
      + '<a class="big verde" href="#/nueva/voz"><span class="ico">🎤</span><span>Hablando<small>Digo la factura en voz alta</small></span></a>'
      + '</div>';
  }

  function nuevoBorrador(origen) {
    return { date: hoy(), client: { name: '', nif: '', address: '' }, lines: [{ concept: '', qty: 1, price: '' }], igic: 7, source: origen || 'mano', avisos: [] };
  }

  // ----- formulario (revisar / escribir) -----
  function pantallaFormulario() {
    if (!borrador) borrador = nuevoBorrador('mano');
    var b = borrador;
    var opcionesIgic = IGICS.map(function (o) { return '<option value="' + o[0] + '"' + (+b.igic === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');
    var lista = D.clientes.map(function (c) { return '<option value="' + esc(c.name) + '">'; }).join('');
    var titulo = b.source === 'foto' ? 'Revise lo que he leído del albarán' : b.source === 'voz' ? 'Revise lo que he entendido' : 'Factura a mano';
    var html = '<h1>' + titulo + '</h1>';
    if (b.source !== 'mano') html += '<div class="ok">Mire que todo esté bien. Puede cambiar cualquier cosa. Luego pulse <b>Guardar factura</b>.</div>';
    (b.avisos || []).forEach(function (a) { html += '<div class="alerta">' + esc(a) + '</div>'; });
    html += '<form id="fform" autocomplete="off" novalidate>'
      + '<label for="fcli">¿A quién le hace la factura?</label>'
      + '<input id="fcli" list="lcli" value="' + esc(b.client.name) + '" placeholder="Nombre del cliente">'
      + '<datalist id="lcli">' + lista + '</datalist>'
      + '<p class="ayuda">Si ya es cliente, empiece a escribir y elija su nombre.</p>'
      + '<label for="fnif">NIF o CIF del cliente <span style="font-weight:400">(si lo tiene)</span></label>'
      + '<input id="fnif" value="' + esc(b.client.nif) + '" placeholder="Ejemplo: B00001172" autocapitalize="characters">'
      + '<p class="ayuda" id="nifinfo"></p>'
      + '<label for="ffecha">Fecha</label>'
      + '<input id="ffecha" type="date" value="' + esc(b.date) + '" max="' + hoy() + '">'
      + '<p class="ayuda">Si no la cambia, la factura lleva la fecha de hoy.</p>'
      + '<h2>¿Qué le cobra?</h2><div id="lineas"></div>'
      + '<button type="button" class="btn sec full" id="masl">➕ Añadir otra cosa</button>'
      + '<label for="figic">IGIC</label><select id="figic">' + opcionesIgic + '</select>'
      + '<div class="totales" id="tot"></div>'
      + '<div class="fila"><button type="submit" class="btn verde full" id="guardar">✅ Guardar factura</button></div>'
      + '<div class="fila"><button type="button" class="btn sec" id="dictar">🎤 Dictar en vez de escribir</button>'
      + '<button type="button" class="btn rojo" id="cancelar">✖ Cancelar</button></div>'
      + '</form>';
    app.innerHTML = html;
    pintaLineas();
    var f = document.getElementById('fform');
    var cli = document.getElementById('fcli'), nif = document.getElementById('fnif');
    cli.addEventListener('change', function () {
      b.client.name = cli.value;
      var c = clientePorNombre(cli.value);
      if (c && P.norm(c.name) === P.norm(cli.value)) { if (!nif.value) nif.value = c.nif; b.client.nif = nif.value; b.client.address = c.address || ''; infoNif(); }
    });
    cli.addEventListener('input', function () { b.client.name = cli.value; });
    nif.addEventListener('input', function () { b.client.nif = nif.value.toUpperCase().replace(/\s/g, ''); infoNif(); });
    document.getElementById('ffecha').addEventListener('change', function (e) { b.date = e.target.value || hoy(); });
    document.getElementById('figic').addEventListener('change', function (e) { b.igic = +e.target.value; pintaTotales(); });
    document.getElementById('masl').onclick = function () { b.lines.push({ concept: '', qty: 1, price: '' }); pintaLineas(); var ins = app.querySelectorAll('.linea input'); ins[ins.length - 3].focus(); };
    document.getElementById('cancelar').onclick = function () { if (confirm('¿Dejar esta factura sin guardar?')) { borrador = null; ir('#/facturacion'); } };
    document.getElementById('dictar').onclick = function () { ir('#/nueva/voz'); };
    f.addEventListener('submit', function (e) { e.preventDefault(); guardaFactura(); });
    infoNif();
    function infoNif() {
      var el = document.getElementById('nifinfo'), v = nif.value.trim();
      if (!v) { el.textContent = ''; return; }
      var r = P.validaNif(v);
      el.innerHTML = r.ok ? '✔ ' + r.tipo + ' correcto' : '⚠ Revise este número: no parece un NIF o CIF correcto (puede guardar igual).';
    }
  }
  function pintaLineas() {
    var b = borrador, cont = document.getElementById('lineas');
    cont.innerHTML = b.lines.map(function (l, i) {
      return '<div class="linea" data-i="' + i + '"><div class="cab"><span>Cosa ' + (i + 1) + '</span>'
        + (b.lines.length > 1 ? '<button type="button" class="quitar" data-q="' + i + '">Quitar</button>' : '') + '</div>'
        + '<label for="lc' + i + '">¿Qué es?</label><input id="lc' + i + '" data-k="concept" value="' + esc(l.concept) + '" placeholder="Ejemplo: cajas de plátanos">'
        + '<div class="dos"><div><label for="lq' + i + '">¿Cuántos?</label><input id="lq' + i + '" data-k="qty" inputmode="decimal" value="' + esc(numTxt(l.qty)) + '"></div>'
        + '<div><label for="lp' + i + '">Precio de cada uno (€)</label><input id="lp' + i + '" data-k="price" inputmode="decimal" value="' + esc(numTxt(l.price)) + '" placeholder="0,00"></div></div>'
        + '<p class="ayuda" id="li' + i + '"></p></div>';
    }).join('');
    cont.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var i = +inp.closest('.linea').getAttribute('data-i'), k = inp.getAttribute('data-k');
        b.lines[i][k] = k === 'concept' ? inp.value : inp.value;
        pintaTotales();
      });
    });
    cont.querySelectorAll('[data-q]').forEach(function (bt) { bt.onclick = function () { b.lines.splice(+bt.getAttribute('data-q'), 1); pintaLineas(); }; });
    pintaTotales();
  }
  function numTxt(n) { if (n === '' || n == null || isNaN(+n) && typeof n !== 'string') return ''; return typeof n === 'number' ? String(n).replace('.', ',') : n; }
  function lineasNumericas(lines) {
    return lines.map(function (l) { return { concept: String(l.concept || '').trim(), qty: P.parseNum(l.qty), price: P.parseNum(l.price) }; });
  }
  function pintaTotales() {
    var b = borrador, ls = lineasNumericas(b.lines);
    ls.forEach(function (l, i) { var el = document.getElementById('li' + i); if (el) el.textContent = (!isNaN(l.qty) && !isNaN(l.price)) ? 'Importe: ' + euros(P.r2(l.qty * l.price)) : ''; });
    var t = P.totales(ls.filter(function (l) { return !isNaN(l.qty) && !isNaN(l.price); }), b.igic);
    var el = document.getElementById('tot');
    if (el) el.innerHTML = '<div><span>Suma</span><span>' + euros(t.base) + '</span></div><div><span>IGIC ' + String(b.igic).replace('.', ',') + ' %</span><span>' + euros(t.tax) + '</span></div><div class="total"><span>TOTAL</span><span>' + euros(t.total) + '</span></div>';
  }
  function guardaFactura() {
    var b = borrador;
    var name = document.getElementById('fcli').value.trim();
    var nif = document.getElementById('fnif').value.trim().toUpperCase().replace(/[\s\-.]/g, '');
    var date = document.getElementById('ffecha').value || hoy();
    var ls = lineasNumericas(b.lines).filter(function (l) { return l.concept || !isNaN(l.price); });
    if (!name) { aviso('Falta el nombre del cliente.'); document.getElementById('fcli').focus(); return; }
    if (!ls.length) { aviso('Falta poner qué le cobra.'); return; }
    for (var i = 0; i < ls.length; i++) {
      if (!ls[i].concept) { aviso('Falta decir qué es la cosa ' + (i + 1) + '.'); return; }
      if (isNaN(ls[i].qty) || ls[i].qty <= 0) { aviso('Revise cuántos hay en la cosa ' + (i + 1) + '.'); return; }
      if (isNaN(ls[i].price) || ls[i].price < 0) { aviso('Falta el precio de la cosa ' + (i + 1) + '.'); return; }
    }
    if (date > hoy()) { aviso('La fecha no puede ser de un día que todavía no ha llegado.'); return; }
    var c = clientePorNombre(name);
    if (c && P.norm(c.name) !== P.norm(name)) c = null;
    if (!c) { c = { name: name, nif: nif, address: '' }; D.clientes.push(c); }
    else if (nif && !c.nif) c.nif = nif;
    var f = { id: 'f' + Date.now(), date: date, client: { name: c.name, nif: nif || c.nif || '', address: c.address || '' }, lines: ls, igic: +b.igic, source: b.source, createdAt: new Date().toISOString() };
    f.number = P.siguienteNumero(D.facturas, date);
    calcula(f);
    D.facturas.push(f); guarda(); borrador = null;
    aviso('Factura ' + f.number + ' guardada.');
    ir('#/factura/' + f.id + '/nueva');
  }

  // ----- por voz -----
  function pantallaVoz() {
    var html = '<h1>Factura hablando</h1>';
    if (!vozDisponible()) {
      app.innerHTML = html + '<div class="alerta">' + esc(MSG_NO_VOZ) + '</div><a class="btn full" href="#/nueva/mano">✍️ Hacerla a mano</a>';
      return;
    }
    app.innerHTML = html + '<p>Pulse el micrófono y diga para quién es, qué le cobra y, si no es de hoy, la fecha.</p>'
      + '<div class="ejemplo">Por ejemplo:<br><b>«Factura para Frutas Demo, diez cajas de plátanos a doce euros, fecha ayer»</b></div>'
      + '<button type="button" class="mic" id="mic" aria-label="Pulsar para hablar">🎤<span>Pulse para hablar</span></button>'
      + '<div class="oido" id="oido" aria-live="polite"></div>'
      + '<a class="btn sec full" href="#/nueva/mano">✍️ Prefiero escribirla a mano</a>';
    var mic = document.getElementById('mic'), oido = document.getElementById('oido');
    mic.onclick = function () {
      escucha(mic, oido, function (texto) {
        var r = P.parseVozFactura(texto, hoy());
        var b = borrador && borrador.source !== 'mano' ? borrador : nuevoBorrador('voz');
        if (borrador && borrador.source === 'mano') b = borrador; // venía del formulario: completar
        b.source = b.source === 'mano' ? 'mano' : 'voz';
        b.avisos = ['He oído: «' + texto + '»'];
        if (r.client) { var c = clientePorNombre(r.client); b.client = c ? { name: c.name, nif: c.nif, address: c.address } : { name: r.client, nif: '', address: '' }; }
        if (r.nif) b.client.nif = r.nif;
        if (r.date) { b.date = r.date > hoy() ? hoy() : r.date; } else if (!b.date) b.date = hoy();
        if (r.igic != null) b.igic = r.igic;
        if (r.lines.length) {
          var vacias = b.lines.filter(function (l) { return l.concept || l.price; });
          b.lines = vacias.concat(r.lines);
        }
        if (!r.client) b.avisos.push('No he entendido el cliente. Escríbalo abajo.');
        if (!r.lines.length) b.avisos.push('No he entendido qué le cobra. Escríbalo abajo.');
        borrador = b;
        ir('#/revisar');
      });
    };
  }

  // ----- por foto (OCR) -----
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
    app.innerHTML = '<h1>Foto del albarán</h1>'
      + '<p>Ponga el albarán en una mesa, con buena luz y recto. Haga la foto de cerca, que se lean bien las letras.</p>'
      + '<label class="big" for="ffoto" style="margin:0"><span class="ico">📷</span><span>Hacer la foto<small>o elegir una foto que ya tenga</small></span></label>'
      + '<input id="ffoto" type="file" accept="image/*" capture="environment" style="position:absolute;left:-9999px">'
      + '<div id="fest"></div>'
      + '<p style="margin-top:24px"><a class="btn sec full" href="#/nueva/mano">✍️ Prefiero escribirla a mano</a></p>'
      + '<p><button type="button" class="btn sec full" id="fej">🧪 Probar con un albarán de ejemplo</button></p>';
    document.getElementById('ffoto').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0]; if (file) procesaFoto(file);
    });
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
        var b = nuevoBorrador('foto');
        if (r.client) { var c = clientePorNombre(r.client); b.client = c ? { name: c.name, nif: c.nif, address: c.address } : { name: r.client, nif: '', address: '' }; }
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

  // ----- ver una factura -----
  function hojaFactura(f) {
    var filas = f.lines.map(function (l) { return '<tr><td>' + esc(l.concept) + '</td><td class="r">' + esc(String(l.qty).replace('.', ',')) + '</td><td class="r">' + euros(l.price) + '</td><td class="r">' + euros(P.r2(l.qty * l.price)) + '</td></tr>'; }).join('');
    return '<div class="hoja" id="hoja"><div class="cab2"><div><h1>FACTURA</h1><div>Número: <b>' + esc(f.number) + '</b></div><div>Fecha: <b>' + fechaCorta(f.date) + '</b></div></div>'
      + '<div style="text-align:right"><b>' + esc(D.empresa.name) + '</b><br>CIF ' + esc(D.empresa.nif) + '<br>' + esc(D.empresa.address) + '</div></div>'
      + '<div style="margin:18px 0;padding:10px 0;border-top:1px solid #000;border-bottom:1px solid #000"><b>Cliente:</b> ' + esc(f.client.name) + (f.client.nif ? ' · NIF/CIF ' + esc(f.client.nif) : '') + (f.client.address ? '<br>' + esc(f.client.address) : '') + '</div>'
      + '<table><thead><tr><th>Concepto</th><th class="r">Cantidad</th><th class="r">Precio</th><th class="r">Importe</th></tr></thead><tbody>' + filas + '</tbody></table>'
      + '<div class="tot"><div><span>Base imponible</span><span>' + euros(f.base) + '</span></div><div><span>IGIC ' + String(f.igic).replace('.', ',') + ' %</span><span>' + euros(f.tax) + '</span></div><div class="g"><span>TOTAL</span><span>' + euros(f.total) + '</span></div></div>'
      + '<p class="nota">Factura de PRUEBA del piloto PAGUU V2, con datos inventados. No tiene validez fiscal ni está enviada a Verifactu.</p></div>';
  }
  function pantallaFactura(id, recien) {
    var f = D.facturas.filter(function (x) { return x.id === id; })[0];
    if (!f) { app.innerHTML = '<h1>No encuentro esa factura</h1><a class="btn" href="#/operacional">Ver facturas</a>'; return; }
    app.innerHTML = (recien ? '<div class="ok no-print" style="font-size:1.3rem">✅ <b>Factura guardada.</b> Número ' + esc(f.number) + '.</div>' : '')
      + '<div class="fila no-print"><button class="btn verde" type="button" id="imp">🖨️ Imprimir o guardar en PDF</button>'
      + (recien ? '<a class="btn" href="#/facturacion">🧾 Hacer otra factura</a>' : '<a class="btn sec" href="#/operacional">⬅ Volver a la lista</a>') + '</div>'
      + hojaFactura(f)
      + '<div class="fila no-print" style="margin-top:30px"><button class="btn rojo" type="button" id="borrar">🗑 Borrar esta factura</button></div>';
    document.getElementById('imp').onclick = function () { window.print(); };
    document.getElementById('borrar').onclick = function () {
      if (confirm('¿Seguro que quiere borrar la factura ' + f.number + '?')) {
        D.facturas = D.facturas.filter(function (x) { return x.id !== f.id; }); guarda(); aviso('Factura borrada.'); ir('#/operacional');
      }
    };
  }

  // ----- Operacional -----
  var filtro = { q: '', cliente: '', mes: '' };
  function aplicaFiltro(lista, fl) {
    return lista.filter(function (f) {
      if (fl.cliente && f.client.name !== fl.cliente) return false;
      if (fl.mes && f.date.slice(0, 7) !== fl.mes) return false;
      if (fl.from && f.date < fl.from) return false;
      if (fl.to && f.date > fl.to) return false;
      if (fl.q) {
        var k = P.norm(fl.q), hay = P.norm([f.number, f.client.name, f.client.nif, fechaCorta(f.date), f.lines.map(function (l) { return l.concept; }).join(' '), String(f.total).replace('.', ',')].join(' '));
        if (hay.indexOf(k) < 0) return false;
      }
      return true;
    });
  }
  function suma(lista) { return P.r2(lista.reduce(function (a, f) { return a + f.total; }, 0)); }
  function nombreMes(ym) { var p = ym.split('-'); var n = P.MESES[+p[1] - 1]; return n.charAt(0).toUpperCase() + n.slice(1) + ' ' + p[0]; }
  function pantallaOperacional() {
    var todas = D.facturas.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.number < b.number ? 1 : -1); });
    var mesActual = hoy().slice(0, 7);
    var delMes = todas.filter(function (f) { return f.date.slice(0, 7) === mesActual; });
    var meses = {}, clientes = {};
    todas.forEach(function (f) {
      var m = f.date.slice(0, 7); meses[m] = meses[m] || { n: 0, t: 0, b: 0, i: 0 }; meses[m].n++; meses[m].t += f.total; meses[m].b += f.base; meses[m].i += f.tax;
      clientes[f.client.name] = clientes[f.client.name] || { n: 0, t: 0 }; clientes[f.client.name].n++; clientes[f.client.name].t += f.total;
    });
    var html = '<h1>Mis facturas</h1>'
      + '<div class="kpis"><div class="kpi">Total facturado<div class="n">' + euros(suma(todas)) + '</div>' + todas.length + ' facturas</div>'
      + '<div class="kpi">Este mes (' + P.MESES[new Date().getMonth()] + ')<div class="n">' + euros(suma(delMes)) + '</div>' + delMes.length + ' facturas</div></div>'
      + '<div class="caja"><b>Preguntar hablando</b> <span class="ayuda">(si quiere)</span>'
      + '<p class="ayuda">Por ejemplo: «¿Cuánto facturé en octubre?» o «Facturas de Frutas Demo»</p>'
      + '<button type="button" class="btn verde full" id="preg"><span>🎤 Pulse y pregunte</span></button>'
      + '<div class="oido" id="poido" aria-live="polite" style="min-height:0"></div><div id="presp"></div></div>'
      + '<h2>Buscar</h2>'
      + '<label for="obus">Escriba un nombre, un número o una cosa</label><input id="obus" type="search" value="' + esc(filtro.q) + '" placeholder="Ejemplo: plátanos">'
      + '<div class="dos" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">'
      + '<div><label for="ocli">Cliente</label><select id="ocli"><option value="">Todos los clientes</option>' + Object.keys(clientes).sort().map(function (c) { return '<option' + (filtro.cliente === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></div>'
      + '<div><label for="omes">Mes</label><select id="omes"><option value="">Todos los meses</option>' + Object.keys(meses).sort().reverse().map(function (m) { return '<option value="' + m + '"' + (filtro.mes === m ? ' selected' : '') + '>' + nombreMes(m) + '</option>'; }).join('') + '</select></div></div>'
      + '<div id="ores"></div>'
      + '<h2>Por mes</h2><table><thead><tr><th>Mes</th><th class="r">Facturas</th><th class="r">IGIC</th><th class="r">Total</th></tr></thead><tbody>'
      + Object.keys(meses).sort().reverse().map(function (m) { return '<tr><td>' + nombreMes(m) + '</td><td class="r">' + meses[m].n + '</td><td class="r">' + euros(meses[m].i) + '</td><td class="r"><b>' + euros(meses[m].t) + '</b></td></tr>'; }).join('') + '</tbody></table>'
      + '<h2>Por cliente</h2><table><thead><tr><th>Cliente</th><th class="r">Facturas</th><th class="r">Total</th></tr></thead><tbody>'
      + Object.keys(clientes).sort(function (a, b) { return clientes[b].t - clientes[a].t; }).map(function (c) { return '<tr><td>' + esc(c) + '</td><td class="r">' + clientes[c].n + '</td><td class="r"><b>' + euros(clientes[c].t) + '</b></td></tr>'; }).join('') + '</tbody></table>';
    app.innerHTML = html;
    function pintaLista(lista, titulo) {
      document.getElementById('ores').innerHTML = '<h2>' + esc(titulo) + '</h2>'
        + '<div class="totales" style="margin:10px 0"><div><span>' + lista.length + ' facturas</span><span><b>' + euros(suma(lista)) + '</b></span></div></div>'
        + (lista.length ? '<ul class="lista">' + lista.map(function (f) {
          return '<li><button type="button" class="fac" data-id="' + f.id + '"><span><b>' + esc(f.client.name) + '</b><br>' + fechaBonita(f.date) + ' · ' + esc(f.number) + '</span><span class="imp">' + euros(f.total) + '</span></button></li>';
        }).join('') + '</ul>' : '<p>No hay facturas con eso.</p>');
      document.querySelectorAll('.fac').forEach(function (b) { b.onclick = function () { ir('#/factura/' + b.getAttribute('data-id')); }; });
    }
    function refresca() {
      var l = aplicaFiltro(todas, filtro);
      var t = filtro.q || filtro.cliente || filtro.mes ? 'Resultado' : 'Todas las facturas';
      pintaLista(l, t);
    }
    document.getElementById('obus').addEventListener('input', function (e) { filtro.q = e.target.value; refresca(); });
    document.getElementById('ocli').addEventListener('change', function (e) { filtro.cliente = e.target.value; refresca(); });
    document.getElementById('omes').addEventListener('change', function (e) { filtro.mes = e.target.value; refresca(); });
    refresca();
    var preg = document.getElementById('preg');
    preg.onclick = function () {
      if (!vozDisponible()) { document.getElementById('presp').innerHTML = '<div class="alerta">' + esc(MSG_NO_VOZ) + ' Use el buscador de abajo.</div>'; return; }
      escucha(preg, document.getElementById('poido'), function (texto) {
        var q = P.parsePregunta(texto, Object.keys(clientes), hoy());
        var lista = aplicaFiltro(todas, { cliente: q.client || '', from: q.from, to: q.to });
        var quien = q.client ? ' a ' + q.client : '';
        var cuando = q.label ? ' ' + q.label : '';
        var r;
        if (q.intent === 'last') {
          var u = lista[0];
          r = u ? 'La última factura' + quien + ' es la ' + u.number + ', del ' + fechaBonita(u.date) + ', a ' + u.client.name + ', por ' + euros(u.total) + '.' : 'No hay facturas' + quien + '.';
        } else if (q.intent === 'count') {
          r = 'Ha hecho ' + lista.length + (lista.length === 1 ? ' factura' : ' facturas') + quien + cuando + ', por un total de ' + euros(suma(lista)) + '.';
        } else if (q.intent === 'total') {
          r = 'Ha facturado ' + euros(suma(lista)) + quien + cuando + ', en ' + lista.length + (lista.length === 1 ? ' factura' : ' facturas') + '.';
        } else if (q.client || q.from) {
          r = 'Hay ' + lista.length + (lista.length === 1 ? ' factura' : ' facturas') + quien + cuando + ', en total ' + euros(suma(lista)) + '. Las tiene abajo.';
        } else {
          r = 'No le he entendido bien. Pruebe: «¿Cuánto facturé en octubre?» o «Facturas de' + (Object.keys(clientes)[0] ? ' ' + Object.keys(clientes)[0] : 'l cliente') + '».';
          lista = null;
        }
        document.getElementById('presp').innerHTML = '<div class="respuesta">' + esc(r) + '</div>';
        habla(r);
        if (lista) pintaLista(lista, 'Lo que ha preguntado');
      });
    };
  }

  // ---------- rutas ----------
  function render() {
    var h = location.hash.replace(/^#\/?/, '').split('/');
    if (reco) { try { reco.abort(); } catch (e) {} reco = null; }
    window.scrollTo(0, 0);
    switch (h[0]) {
      case 'facturacion': borrador = null; pantallaFacturacion(); break;
      case 'nueva':
        if (h[1] === 'foto') { borrador = null; pantallaFoto(); }
        else if (h[1] === 'voz') pantallaVoz();
        else { borrador = borrador && borrador.source === 'mano' ? borrador : nuevoBorrador('mano'); pantallaFormulario(); }
        break;
      case 'revisar': pantallaFormulario(); break;
      case 'factura': pantallaFactura(h[1], h[2] === 'nueva'); break;
      case 'operacional': pantallaOperacional(); break;
      default: pantallaInicio();
    }
    app.focus({ preventScroll: true });
  }
  document.getElementById('btnInicio').onclick = function () { borrador = null; ir('#/'); };
  window.addEventListener('hashchange', render);
  carga();
  render();
})();
