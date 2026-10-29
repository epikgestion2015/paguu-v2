// Pruebas de PAGUU V2: node test/test.js
const P = require('../js/parse.js');
const assert = require('assert');
const HOY = '2026-10-29';
let ok = 0, fail = 0;
function t(name, fn) { try { fn(); ok++; console.log('OK  ', name); } catch (e) { fail++; console.log('FALLA', name, '\n     ', e.message); } }
const eq = (a, b) => assert.deepStrictEqual(a, b);
const fecha = s => (P.parseFecha(s, HOY) || {}).date || null;

// Números
t('parseNum formatos', () => { eq(P.parseNum('1.234,56'), 1234.56); eq(P.parseNum('12,5'), 12.5); eq(P.parseNum('12.50'), 12.5); eq(P.parseNum('1.234'), 1234); eq(P.parseNum('7 €'), 7); });
t('palabras a números', () => {
  eq(P.palabrasANumeros('diez cajas a doce euros'), '10 cajas a 12 euros');
  eq(P.palabrasANumeros('treinta y cinco kilos'), '35 kilos');
  eq(P.palabrasANumeros('doscientos cincuenta euros'), '250 euros');
  eq(P.palabrasANumeros('mil quinientos'), '1500');
  eq(P.palabrasANumeros('doce euros con cincuenta'), '12,50 euros');
  eq(P.palabrasANumeros('Frutas y Verduras'), 'Frutas y Verduras');
});

// Fechas
t('fecha hoy/ayer/anteayer', () => { eq(fecha('hoy'), HOY); eq(fecha('ayer'), '2026-10-28'); eq(fecha('anteayer'), '2026-10-27'); eq(fecha('antes de ayer'), '2026-10-27'); });
t('fecha "el 3 de octubre"', () => eq(fecha('el 3 de octubre'), '2026-10-03'));
t('fecha "tres de octubre" con palabras', () => eq(fecha('tres de octubre'), '2026-10-03'));
t('fecha "uno de septiembre"', () => eq(fecha('el uno de septiembre'), '2026-09-01'));
t('fecha "el primero de agosto"', () => eq(fecha('el primero de agosto'), '2026-08-01'));
t('fecha con año', () => eq(fecha('15 de marzo de 2025'), '2025-03-15'));
t('fecha futura sin año -> año anterior', () => eq(fecha('20 de diciembre'), '2025-12-20'));
t('fecha 03/10/2026 y 3/10', () => { eq(fecha('03/10/2026'), '2026-10-03'); eq(fecha('3/10'), '2026-10-03'); eq(fecha('3-10-26'), '2026-10-03'); });
t('fecha "hace 5 días"', () => eq(fecha('hace cinco días'), '2026-10-24'));
t('fecha "el día 5"', () => eq(fecha('el día 5'), '2026-10-05'));
t('fecha inválida', () => { eq(fecha('31 de febrero'), null); eq(fecha('sin fecha aquí'), null); });

// NIF / CIF
t('validación NIF/CIF/NIE', () => {
  eq(P.validaNif('B00000992'), { ok: true, tipo: 'CIF' });
  eq(P.validaNif('B00000993').ok, false);
  eq(P.validaNif('00000000T'), { ok: true, tipo: 'NIF' });
  eq(P.validaNif('00000000A').ok, false);
  eq(P.validaNif('X0000000T'), { ok: true, tipo: 'NIE' });
  eq(P.validaNif('b-0000099-2').ok, true);
});

// Voz: factura
t('voz: factura completa con ayer', () => {
  const r = P.parseVozFactura('Factura para Frutas Demo, 10 cajas de plátanos a 12 euros, fecha ayer', HOY);
  eq(r.client, 'Frutas Demo'); eq(r.date, '2026-10-28'); eq(r.lines, [{ concept: 'Cajas de plátanos', qty: 10, price: 12 }]);
});
t('voz: palabras, dos líneas, fecha concreta', () => {
  const r = P.parseVozFactura('factura para bar ejemplo diez kilos de papas a dos euros con cincuenta, y cinco botellas de agua a un euro el 3 de octubre', HOY);
  eq(r.client, 'Bar Ejemplo'); eq(r.date, '2026-10-03');
  eq(r.lines, [{ concept: 'Kilos de papas', qty: 10, price: 2.5 }, { concept: 'Botellas de agua', qty: 5, price: 1 }]);
});
t('voz: sin fecha -> null (la app pone hoy)', () => { const r = P.parseVozFactura('cliente Taller Ficticio, reparación del motor por 150 euros', HOY); eq(r.date, null); eq(r.client, 'Taller Ficticio'); eq(r.lines, [{ concept: 'Reparación del motor', qty: 1, price: 150 }]); });
t('voz: IGIC y CIF', () => {
  const r = P.parseVozFactura('factura a Ferretería Prueba con CIF B 0000 1172, 3 martillos a 8 euros, IGIC del 3 por ciento', HOY);
  eq(r.client, 'Ferretería Prueba'); eq(r.nif, 'B00001172'); eq(r.igic, 3); eq(r.lines, [{ concept: 'Martillos', qty: 3, price: 8 }]);
});
t('voz: sin igic', () => eq(P.parseVozFactura('para María Ejemplo, 2 horas de limpieza a 15 euros, sin igic', HOY).igic, 0));
t('voz: concepto/cantidad/precio', () => {
  const r = P.parseVozFactura('cliente Frutas Demo, concepto mangos cantidad 4 precio 3 euros', HOY);
  eq(r.lines, [{ concept: 'Mangos', qty: 4, price: 3 }]);
});
t('voz: "con fecha 15 de septiembre"', () => { const r = P.parseVozFactura('factura para Frutas Demo con fecha 15 de septiembre, 2 cajas de mangos a 20 euros', HOY); eq(r.date, '2026-09-15'); eq(r.client, 'Frutas Demo'); eq(r.lines.length, 1); });

t('voz: formato que da Chrome (cifras y €)', () => {
  const r = P.parseVozFactura('factura para Frutas Demo 10 cajas de plátanos a 12,50 € y 3 sacos de papas a 8 € el 3 de octubre', HOY);
  eq(r.client, 'Frutas Demo'); eq(r.date, '2026-10-03');
  eq(r.lines, [{ concept: 'Cajas de plátanos', qty: 10, price: 12.5 }, { concept: 'Sacos de papas', qty: 3, price: 8 }]);
});

// Voz: preguntas
const CL = ['Frutas Demo SL', 'Bar Ejemplo SL', 'Ferretería Prueba SL', 'Taller Ficticio SL', 'María Ejemplo Pérez'];
t('pregunta: ¿cuánto facturé en octubre?', () => { const q = P.parsePregunta('¿Cuánto facturé en octubre?', CL, HOY); eq([q.intent, q.from, q.to, q.client], ['total', '2026-10-01', '2026-10-31', null]); });
t('pregunta: facturas de Frutas Demo', () => { const q = P.parsePregunta('facturas de frutas demo', CL, HOY); eq([q.intent, q.client, q.from], ['list', 'Frutas Demo SL', null]); });
t('pregunta: ¿cuántas facturas este mes al bar ejemplo?', () => { const q = P.parsePregunta('¿cuántas facturas le hice este mes al bar ejemplo?', CL, HOY); eq([q.intent, q.client, q.from], ['count', 'Bar Ejemplo SL', '2026-10-01']); });
t('pregunta: ferreteria sin tilde + mes pasado', () => { const q = P.parsePregunta('cuanto le facture a la ferreteria el mes pasado', CL, HOY); eq([q.intent, q.client, q.from, q.to], ['total', 'Ferretería Prueba SL', '2026-09-01', '2026-09-30']); });
t('pregunta: última factura', () => eq(P.parsePregunta('¿cuál fue la última factura?', CL, HOY).intent, 'last'));
t('pregunta: diciembre -> año pasado', () => eq(P.parsePregunta('cuánto en diciembre', CL, HOY).from, '2025-12-01'));
t('pregunta: este año', () => eq(P.parsePregunta('total de este año', CL, HOY).from, '2026-01-01'));

// OCR albarán
const ALB1 = `EMPRESA DEMO PAGUU SL
CIF: B00000992
Calle Ficticia 1, Las Palmas
ALBARÁN Nº A-2026-118
Fecha: 27/10/2026
Cliente: Frutas Demo SL
CIF: B00001172
Cantidad Descripción Precio Importe
10 Cajas de plátanos 12,00 120,00
5 Sacos de papas 8,50 42,50
2 Mangos kilo 3,25 6,50
Subtotal 169,00
IGIC 7% 11,83
TOTAL 180,83 €`;
t('albarán 1: cliente, CIF, fecha, número, líneas, total', () => {
  const r = P.parseAlbaran(ALB1, { ownNif: 'B00000992', ownName: 'EMPRESA DEMO PAGUU SL', hoy: HOY });
  eq(r.client, 'Frutas Demo SL'); eq(r.nif, 'B00001172'); eq(r.date, '2026-10-27'); eq(r.number, 'A-2026-118'); eq(r.total, 180.83);
  eq(r.lines, [{ concept: 'Cajas de plátanos', qty: 10, price: 12 }, { concept: 'Sacos de papas', qty: 5, price: 8.5 }, { concept: 'Mangos kilo', qty: 2, price: 3.25 }]);
  eq(P.totales(r.lines, 7), { base: 169, tax: 11.83, total: 180.83 });
});
const ALB2 = `ALBARAN DE ENTREGA 0457
Destinatario: Bar Ejemplo SL   NIF B00002147
Fecha 05-10-2026
Concepto Uds Precio Total
Botellas agua 1,5L 24 0,60 14,40
Refresco cola lata 48 0,75 36,00
Total 50,40`;
t('albarán 2: descripción primero, número con coma en concepto', () => {
  const r = P.parseAlbaran(ALB2, { ownNif: 'B00000992', hoy: HOY });
  eq(r.client, 'Bar Ejemplo SL'); eq(r.nif, 'B00002147'); eq(r.date, '2026-10-05'); eq(r.number, '0457'); eq(r.total, 50.4);
  eq(r.lines.map(l => [l.qty, l.price]), [[24, 0.6], [48, 0.75]]);
  eq(r.lines[1].concept, 'Refresco cola lata');
});
const ALB3 = `Taller Ficticio SL
B00003459
Fecha: 12/09/2026
Revisión general 1 85,00 85,00
Aceite motor 4 9,95 39,80`;
t('albarán 3: cliente deducido junto al CIF (sin "Cliente:")', () => {
  const r = P.parseAlbaran(ALB3, { ownNif: 'B00000992', hoy: HOY });
  eq(r.client, 'Taller Ficticio SL'); eq(r.nif, 'B00003459'); eq(r.date, '2026-09-12'); eq(r.lines.length, 2); eq(r.lines[1], { concept: 'Aceite motor', qty: 4, price: 9.95 });
});
// Texto real que devolvió Tesseract.js (spa) con una foto girada y con ruido de albaran-ejemplo.png
const ALB_OCR = `EMPRESA DEMO PAGUU SL ALBARÁN N* A-2026-118
CIF: B00000992 Fecha: 27/10/2026
Calle Ficticia 1, Las Palmas (datos inventados)
Cliente: Frutas Demo SE
CIF: B00001172
Cantidad Descripción Precio Importe
10 Cajas de plátanos 12,00 120,00
5 Sacos de papas 8,50 42,50
2 Mangos kilo 3,25 6,50
Subtotal 169,00
IGIC 7% 11.83
TOTAL 180,83 €`;
t('albarán OCR real (foto con ruido): todo leído', () => {
  const r = P.parseAlbaran(ALB_OCR, { ownNif: 'B00000992', ownName: 'EMPRESA DEMO PAGUU SL', hoy: HOY });
  eq([r.nif, r.date, r.number, r.total, r.lines.length], ['B00001172', '2026-10-27', 'A-2026-118', 180.83, 3]);
  eq(P.buscaCliente(r.client, ['Frutas Demo SL', 'Bar Ejemplo SL']), 'Frutas Demo SL');
});
t('albarán vacío: avisos', () => { const r = P.parseAlbaran('xx', {}); assert(r.avisos.length === 3); });

// Cálculo y numeración
t('totales IGIC 7%', () => eq(P.totales([{ qty: 3, price: 33.33 }], 7), { base: 99.99, tax: 7, total: 106.99 }));
t('numeración automática por año', () => { eq(P.siguienteNumero([{ number: 'F2026-0007' }, { number: 'F2026-0012' }, { number: 'F2025-0099' }], '2026-10-29'), 'F2026-0013'); eq(P.siguienteNumero([], '2027-01-02'), 'F2027-0001'); });

console.log(`\n${ok} correctas, ${fail} fallidas`);
process.exit(fail ? 1 : 0);
