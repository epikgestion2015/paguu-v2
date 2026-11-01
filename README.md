# PAGUU V2 · piloto

Programa nuevo y separado de PAGUU. Muy sencillo, pensado para personas mayores sin experiencia con ordenadores. Mismos colores que PAGUU.

- **Inicio**: lo facturado este mes y este año, nº de facturas, últimas facturas y presupuestos pendientes. Botones grandes: Nueva factura, Nuevo presupuesto, Clientes, Ver facturas y presupuestos.
- **Facturas** (F2026-0001…): fecha de hoy por defecto, IGIC 7 % (se puede cambiar), líneas con concepto, cantidad y precio. Cliente guardado o nuevo (con «Guardar este cliente»). Imprimir o guardar en PDF desde el navegador.
- **Presupuestos** (P2026-0001…): igual que una factura, con estado pendiente / aceptado / rechazado y botón «Convertir en factura».
- **Clientes**: crear, editar, borrar y buscar. NIF, NIE y CIF con comprobación del formato español.
- **Configuración de factura** (⚙️ en Inicio): logo (se reduce a 600×240 y se guarda en el navegador) o nombre comercial; nombre/razón social, NIF/NIE/CIF (validado), dirección, teléfono, email, IBAN (validado), nota al pie y color (turquesa, petróleo, azul noche o verde). Sale en todas las facturas y presupuestos.
- **Facturas con diseño nuevo**: cabecera con logo o nombre, bloques De/Para, tabla limpia, totales destacados, forma de pago con IBAN y pie. Preparada para imprimir en A4. Importes con punto de miles (1.428,19 €).
- Fondo azul suave.
- Opcional: rellenar con foto del albarán (OCR) o hablando (Chrome / Edge).

**Datos de prueba inventados** (EMPRESA DEMO PAGUU SL, CIF B00000992). Todo se guarda solo en el navegador de cada persona (localStorage). No tiene validez fiscal ni envía nada a Verifactu.

## Pruebas

```
node test/test.js                                     # fechas, voz, albaranes, NIF/NIE/CIF, totales, numeración
NODE_PATH=<carpeta con jsdom> node test/ui-test.js    # interfaz (jsdom, micrófono simulado)
```
