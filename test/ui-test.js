// Prueba de la interfaz con jsdom (sin navegador real). Uso: NODE_PATH=<carpeta con jsdom> node test/ui-test.js
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace('<script src="js/parse.js"></script>', '').replace('<script src="js/app.js"></script>', '');
const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://example.test/', pretendToBeVisual: true });
const w = dom.window, d = w.document;
let frase = '';
class FakeSR { start() { setTimeout(() => { this.onresult({ results: [Object.assign([{ transcript: frase }], { isFinal: true })] }); this.onend(); }, 5); } stop() {} abort() {} }
let confirmar = true;
w.webkitSpeechRecognition = FakeSR; w.confirm = () => confirmar; w.print = () => { w.__printed = true; }; w.scrollTo = () => {};
w.eval(fs.readFileSync(path.join(root, 'js/parse.js'), 'utf8'));
w.eval(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'));
const wait = ms => new Promise(r => setTimeout(r, ms));
const go = async h => { w.location.hash = h; await wait(20); };
const txt = () => d.getElementById('app').textContent;
const $ = id => d.getElementById(id);
const datos = () => JSON.parse(w.localStorage.getItem('paguuV2.datos.v2'));
let ok = 0, fail = 0;
const check = (name, cond) => { if (cond) { ok++; console.log('OK  ', name); } else { fail++; console.log('FALLA', name); } };
const pad = n => String(n).padStart(2, '0'); const iso = x => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
const hoy = new Date(), HOY = iso(hoy), Y = hoy.getFullYear();
const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1); const AYER = iso(ayer);
const set = (id, v) => { const e = $(id); e.value = v; e.dispatchEvent(new w.Event('input', { bubbles: true })); e.dispatchEvent(new w.Event('change', { bubbles: true })); };
const submit = async id => { $(id).dispatchEvent(new w.Event('submit', { cancelable: true })); await wait(20); };
const eur = n => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
(async () => {
  await wait(20);
  // INICIO
  const D0 = datos();
  check('datos demo ficticios (11 facturas, 3 presupuestos, 5 clientes, CIF B00000992)', D0.facturas.length === 11 && D0.presupuestos.length === 3 && D0.clientes.length === 5 && D0.empresa.nif === 'B00000992' && !/EPIK|EG26/i.test(JSON.stringify(D0)));
  check('inicio: 4 accesos grandes (Nueva factura, Nuevo presupuesto, Clientes, Ver facturas y presupuestos)', d.querySelectorAll('.big').length === 4 && $('irFactura') && $('irPresupuesto') && $('irClientes') && $('irDocs'));
  check('inicio: ya no salen Facturación/Operacional', !/Operacional/.test(txt()));
  const mes = HOY.slice(0, 7), fMes = D0.facturas.filter(f => f.date.slice(0, 7) === mes), fAn = D0.facturas.filter(f => f.date.slice(0, 4) === String(Y));
  check('inicio: total del mes = ' + eur(fMes.reduce((a, f) => a + f.total, 0)), $('kMes').textContent.includes(eur(fMes.reduce((a, f) => a + f.total, 0)) + ' €') && $('kMes').textContent.includes(fMes.length + ' factura'));
  check('inicio: total del año y nº de facturas', $('kAnyo').textContent.includes(eur(fAn.reduce((a, f) => a + f.total, 0)) + ' €') && $('kAnyo').textContent.includes(fAn.length + ' factura'));
  check('inicio: presupuestos pendientes = 2', /pendientes\s*2/.test($('kPend').textContent) && $('pendientes').querySelectorAll('.fac').length === 2);
  check('inicio: últimas 5 facturas', $('ultimas').querySelectorAll('.fac').length === 5);

  // FACTURA con cliente nuevo y "guardar cliente"
  await go('#/nueva/factura');
  check('factura: fecha hoy por defecto e IGIC 7 %', $('ffecha').value === HOY && $('figic').value === '7');
  check('factura: foto y voz opcionales, plegadas', $('rapido') && !$('rapido').open && $('irFoto') && $('irVoz'));
  set('fcli', 'Panadería Inventada SL'); set('fnif', 'B00005670');
  check('factura: aviso de CIF incorrecto', /Revise/.test($('nifinfo').textContent));
  set('fnif', 'B00005678');
  check('factura: CIF correcto', /CIF correcto/.test($('nifinfo').textContent));
  set('fdir', 'Calle Falsa 9 (inventada)');
  check('factura: casilla "Guardar este cliente" marcada', $('fguardar').checked && !$('lguardar').hidden);
  set('lc0', 'Pan de molde'); set('lq0', '10'); set('lp0', '12,50');
  const tt = $('tot').textContent;
  check('factura: totales en vivo IGIC 7 % (125,00 + 8,75 = 133,75)', /125,00\s€/.test(tt) && /8,75\s€/.test(tt) && /133,75\s€/.test(tt));
  set('figic', '3');
  check('factura: cambiar IGIC a 3 %', /3,75\s€/.test($('tot').textContent) && /128,75\s€/.test($('tot').textContent));
  set('figic', '7');
  await submit('fform');
  let D1 = datos(), f1 = D1.facturas[D1.facturas.length - 1];
  check('factura: número F' + Y + '-0001+ y vista', /^F\d{4}-\d{4}$/.test(f1.number) && f1.number.startsWith('F' + Y) && /Factura guardada/.test(txt()) && /FACTURA/.test(txt()));
  check('factura: cliente nuevo guardado en Clientes', D1.clientes.length === 6 && D1.clientes.some(c => c.name === 'Panadería Inventada SL' && c.nif === 'B00005678'));
  $('imp').click();
  check('imprimir/guardar PDF llama a window.print', w.__printed === true);

  // FACTURA con cliente guardado
  await go('#/nueva/factura');
  const c1 = D1.clientes.find(c => c.name === 'Frutas Demo SL');
  set('fsel', c1.id);
  check('factura: elegir cliente guardado rellena nombre/CIF/dirección y oculta "guardar"', $('fcli').value === 'Frutas Demo SL' && $('fnif').value === 'B00001172' && $('fdir').value.length > 0 && $('lguardar').hidden);
  set('lc0', 'Cajas de mangos'); set('lq0', '2'); set('lp0', '18');
  await submit('fform');
  D1 = datos();
  check('factura: no duplica cliente guardado', D1.clientes.length === 6 && D1.facturas.length === 13);

  // Cliente nuevo sin guardar
  await go('#/nueva/factura');
  set('fcli', 'Cliente De Paso'); $('fguardar').checked = false; $('fguardar').dispatchEvent(new w.Event('change'));
  set('lc0', 'Recado'); set('lp0', '5');
  await submit('fform');
  check('factura: cliente nuevo SIN guardar no se añade a Clientes', datos().clientes.length === 6 && datos().facturas.length === 14);

  // validación
  await go('#/nueva/factura');
  await submit('fform');
  check('validación: sin cliente no guarda y avisa', /Falta el nombre/.test($('aviso').textContent) && datos().facturas.length === 14);

  // VOZ desde el formulario
  await go('#/nueva/factura'); $('irVoz').click(); await wait(20);
  frase = 'Factura para Bar Ejemplo, 5 botellas de agua a 1 euro, fecha ayer';
  $('mic').click(); await wait(60);
  check('voz: vuelve al formulario con cliente guardado, CIF, fecha ayer y línea', w.location.hash === '#/revisar' && $('fsel').value === 'c2' && $('fcli').value === 'Bar Ejemplo SL' && $('fnif').value === 'B00002147' && $('ffecha').value === AYER && $('lc0').value === 'Botellas de agua' && $('lq0').value === '5');
  await submit('fform');
  D1 = datos();
  check('voz: factura guardada', D1.facturas.length === 15 && D1.facturas[14].source === 'voz' && D1.facturas[14].date === AYER);

  // FOTO: pantalla accesible desde el formulario
  await go('#/nueva/factura'); await go('#/foto');
  check('foto: pantalla del albarán con botón de cámara y ejemplo', $('ffoto') && $('ffoto').getAttribute('capture') === 'environment' && $('fej'));

  // PRESUPUESTO
  await go('#/nueva/presupuesto');
  check('presupuesto: formulario propio con fecha hoy', /Nuevo presupuesto/.test(txt()) && $('ffecha').value === HOY && /Guardar presupuesto/.test($('guardar').textContent));
  set('fsel', 'c3'); set('lc0', 'Escaleras'); set('lq0', '2'); set('lp0', '45');
  await submit('fform');
  D1 = datos(); const p1 = D1.presupuestos[D1.presupuestos.length - 1];
  check('presupuesto: número P' + Y + '-000N y estado pendiente', p1.number.startsWith('P' + Y + '-') && p1.estado === 'pendiente' && /PRESUPUESTO/.test(txt()) && $('convertir'));
  d.querySelector('[data-estado="rechazado"]').click(); await wait(20);
  check('presupuesto: cambiar estado a rechazado', datos().presupuestos.find(p => p.id === p1.id).estado === 'rechazado' && /Rechazado/.test($('estadoActual').textContent));
  d.querySelector('[data-estado="pendiente"]').click(); await wait(20);
  $('convertir').click(); await wait(30);
  D1 = datos(); const fc = D1.facturas[D1.facturas.length - 1], pc = D1.presupuestos.find(p => p.id === p1.id);
  check('convertir en factura: crea factura F con mismas líneas y fecha hoy', fc.number.startsWith('F' + Y) && fc.date === HOY && fc.total === p1.total && fc.lines[0].concept === 'Escaleras' && fc.client.name === 'Ferretería Prueba SL');
  check('convertir: presupuesto queda aceptado y enlazado', pc.estado === 'aceptado' && pc.facturaId === fc.id && w.location.hash === '#/doc/' + fc.id + '/nueva');
  await go('#/doc/' + p1.id);
  check('presupuesto convertido: muestra enlace a la factura y no deja reconvertir', !$('convertir') && txt().includes(fc.number));

  // LISTAS
  await go('#/documentos');
  check('lista: pestañas Facturas/Presupuestos, todas las facturas', $('tabF') && $('tabP') && d.querySelectorAll('.fac').length === D1.facturas.length);
  set('obus', 'plátanos');
  check('lista: buscar "plátanos" (2 facturas demo)', d.querySelectorAll('.fac').length === 2);
  set('obus', '');
  $('dpreg').open = true;
  const mesN = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][hoy.getMonth()];
  frase = '¿Cuánto facturé en ' + mesN + '?';
  $('preg').click(); await wait(60);
  const totMes = datos().facturas.filter(f => f.date.slice(0, 7) === mes).reduce((a, f) => a + f.total, 0);
  check('lista voz: "¿cuánto facturé en ' + mesN + '?" -> ' + eur(totMes) + ' €', d.querySelector('.respuesta') && d.querySelector('.respuesta').textContent.includes(eur(totMes)));
  await go('#/documentos/presupuestos');
  check('lista presupuestos con estados', d.querySelectorAll('.fac').length === 4 && d.querySelectorAll('.estado').length === 4);

  // CLIENTES
  await go('#/clientes');
  check('clientes: lista de 6 guardados', d.querySelectorAll('[data-cid]').length === 6);
  set('cbus', 'frutas');
  check('clientes: buscar', d.querySelectorAll('[data-cid]').length === 1);
  await go('#/cliente/nuevo');
  set('cnom', ''); await submit('cform');
  check('cliente: sin nombre no guarda', /Falta el nombre/.test($('aviso').textContent) && datos().clientes.length === 6);
  set('cnom', 'Ana Inventada Ruiz'); set('cnif', 'X0000000T'); set('ctel', '600 000 009'); set('cmail', 'ana@ejemplo');
  check('cliente: NIE válido y aviso de email mal', /NIE correcto/.test($('cnifinfo').textContent) && /email/.test($('cmailinfo').textContent));
  await submit('cform');
  check('cliente: email incorrecto no guarda', datos().clientes.length === 6);
  set('cmail', 'ana@ejemplo.test'); await submit('cform');
  let ana = datos().clientes.find(c => c.name === 'Ana Inventada Ruiz');
  check('cliente: crear con NIE, teléfono y email', ana && ana.nif === 'X0000000T' && ana.phone === '600 000 009' && ana.email === 'ana@ejemplo.test' && w.location.hash === '#/clientes');
  await go('#/cliente/nuevo'); set('cnom', 'Otro Inventado'); set('cnif', '12345678A');
  confirmar = false; await submit('cform');
  check('cliente: NIF con letra mala pide confirmación (si dice que no, no guarda)', !datos().clientes.some(c => c.name === 'Otro Inventado'));
  confirmar = true;
  await go('#/cliente/' + ana.id);
  set('cdir', 'Calle Nueva 3 (inventada)'); await submit('cform');
  check('cliente: editar', datos().clientes.find(c => c.id === ana.id).address === 'Calle Nueva 3 (inventada)');
  await go('#/cliente/' + ana.id); $('cfactura').click(); await wait(20);
  check('cliente: "hacer factura a este cliente" abre la factura con él', $('fsel').value === ana.id && $('fcli').value === 'Ana Inventada Ruiz');
  await go('#/cliente/' + ana.id); $('cborrar').click(); await wait(20);
  check('cliente: borrar', !datos().clientes.some(c => c.id === ana.id) && datos().clientes.length === 6);

  // volver al inicio refleja lo nuevo
  $('btnInicio').click(); await wait(30);
  const D2 = datos(), fMes2 = D2.facturas.filter(f => f.date.slice(0, 7) === mes);
  check('inicio actualizado tras facturar', $('kMes').textContent.includes(eur(fMes2.reduce((a, f) => a + f.total, 0)) + ' €'));
  // sin voz
  delete w.webkitSpeechRecognition;
  console.log(`\n${ok} correctas, ${fail} fallidas`);
  process.exit(fail ? 1 : 0);
})();
