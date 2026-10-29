// Prueba de la interfaz con jsdom (sin navegador real). Uso: NODE_PATH=<carpeta con jsdom> node test/ui-test.js
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace('<script src="js/parse.js"></script>', '')
  .replace('<script src="js/app.js"></script>', '');
const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://example.test/', pretendToBeVisual: true });
const w = dom.window, d = w.document;
// Micrófono simulado
let frase = '';
class FakeSR { start() { setTimeout(() => { this.onresult({ results: [Object.assign([{ transcript: frase }], { isFinal: true })] }); this.onend(); }, 5); } stop() {} abort() {} }
w.webkitSpeechRecognition = FakeSR; w.confirm = () => true; w.print = () => { w.__printed = true; }; w.scrollTo = () => {};
w.eval(fs.readFileSync(path.join(root, 'js/parse.js'), 'utf8'));
w.eval(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'));
const wait = ms => new Promise(r => setTimeout(r, ms));
const go = async h => { w.location.hash = h; await wait(20); };
const txt = () => d.getElementById('app').textContent;
let ok = 0, fail = 0;
const check = (name, cond) => { if (cond) { ok++; console.log('OK  ', name); } else { fail++; console.log('FALLA', name); } };
const hoy = new Date(); const pad = n => String(n).padStart(2, '0'); const HOY = `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`;
const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1); const AYER = `${ayer.getFullYear()}-${pad(ayer.getMonth() + 1)}-${pad(ayer.getDate())}`;
const set = (id, v) => { const e = d.getElementById(id); e.value = v; e.dispatchEvent(new w.Event('input', { bubbles: true })); e.dispatchEvent(new w.Event('change', { bubbles: true })); };
(async () => {
  await wait(20);
  check('inicio: dos botones Facturación y Operacional', /Facturación/.test(txt()) && /Operacional/.test(txt()) && d.querySelectorAll('.big').length === 2);
  const datos = JSON.parse(w.localStorage.getItem('paguuV2.datos.v1'));
  check('datos demo ficticios cargados (11 facturas, CIF B00000992)', datos.facturas.length === 11 && datos.empresa.nif === 'B00000992' && !/EPIK|EG26/i.test(JSON.stringify(datos)));
  await go('#/facturacion');
  check('facturación: 3 formas (foto, a mano, hablando)', d.querySelectorAll('.big').length === 3 && /Foto del albarán/.test(txt()) && /Hablando/.test(txt()));
  await go('#/nueva/mano');
  check('a mano: la fecha por defecto es hoy', d.getElementById('ffecha').value === HOY);
  set('fcli', 'Frutas Demo SL');
  check('a mano: al elegir cliente se rellena su CIF', d.getElementById('fnif').value === 'B00001172');
  set('lc0', 'Cajas de plátanos'); set('lq0', '10'); set('lp0', '12,50');
  check('a mano: totales en vivo con IGIC 7 %', /125,00\s€/.test(d.getElementById('tot').textContent) && /8,75\s€/.test(d.getElementById('tot').textContent) && /133,75\s€/.test(d.getElementById('tot').textContent));
  d.getElementById('fform').dispatchEvent(new w.Event('submit', { cancelable: true }));
  await wait(20);
  const n = `F${hoy.getFullYear()}-`;
  check('guardar: número automático y vista de factura', w.location.hash.includes('/nueva') && /Factura guardada/.test(txt()) && txt().includes(n));
  d.getElementById('imp').click();
  check('botón imprimir/PDF llama a window.print', w.__printed === true);
  // voz
  await go('#/facturacion'); await go('#/nueva/voz');
  frase = 'Factura para Bar Ejemplo, 5 botellas de agua a 1 euro, fecha ayer';
  d.getElementById('mic').click(); await wait(60);
  check('voz: pasa a revisar con cliente, CIF, fecha ayer y línea', w.location.hash === '#/revisar' && d.getElementById('fcli').value === 'Bar Ejemplo SL' && d.getElementById('fnif').value === 'B00002147' && d.getElementById('ffecha').value === AYER && d.getElementById('lc0').value === 'Botellas de agua' && d.getElementById('lq0').value === '5');
  d.getElementById('fform').dispatchEvent(new w.Event('submit', { cancelable: true })); await wait(20);
  const datos2 = JSON.parse(w.localStorage.getItem('paguuV2.datos.v1'));
  check('voz: factura guardada (13 en total)', datos2.facturas.length === 13 && datos2.facturas[12].source === 'voz' && datos2.facturas[12].date === AYER);
  // validación
  await go('#/facturacion'); await go('#/nueva/mano');
  d.getElementById('fform').dispatchEvent(new w.Event('submit', { cancelable: true })); await wait(20);
  check('validación: sin cliente no guarda y avisa', /Falta el nombre/.test(d.getElementById('aviso').textContent) && JSON.parse(w.localStorage.getItem('paguuV2.datos.v1')).facturas.length === 13);
  // operacional
  await go('#/operacional');
  check('operacional: lista, por mes y por cliente', /Mis facturas/.test(txt()) && /Por mes/.test(txt()) && /Por cliente/.test(txt()) && d.querySelectorAll('.fac').length === 13);
  set('obus', 'plátanos');
  check('operacional: buscar "plátanos"', d.querySelectorAll('.fac').length === 3);
  set('obus', '');
  const mes = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][hoy.getMonth()];
  frase = '¿Cuánto facturé en ' + mes + '?';
  d.getElementById('preg').click(); await wait(60);
  const datos3 = JSON.parse(w.localStorage.getItem('paguuV2.datos.v1'));
  const ym = HOY.slice(0, 7); const tot = datos3.facturas.filter(f => f.date.slice(0, 7) === ym).reduce((a, f) => a + f.total, 0);
  const esperado = tot.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  check('operacional voz: "¿cuánto facturé en ' + mes + '?" -> ' + esperado + ' €', d.querySelector('.respuesta') && d.querySelector('.respuesta').textContent.includes(esperado));
  frase = 'facturas de frutas demo';
  d.getElementById('preg').click(); await wait(60);
  const nf = datos3.facturas.filter(f => f.client.name === 'Frutas Demo SL').length;
  check('operacional voz: "facturas de frutas demo" -> ' + nf + ' facturas', d.querySelectorAll('.fac').length === nf && d.querySelector('.respuesta').textContent.includes('Hay ' + nf));
  // sin voz
  delete w.webkitSpeechRecognition;
  console.log(`\n${ok} correctas, ${fail} fallidas`);
  process.exit(fail ? 1 : 0);
})();
