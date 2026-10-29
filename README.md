# PAGUU V2 · piloto

Programa nuevo y separado de PAGUU. Muy sencillo, pensado para personas mayores sin experiencia con ordenadores.

- **Facturación**: factura nueva con foto del albarán (se rellena sola), a mano o hablando.
- **Operacional**: ver todas las facturas, totales por mes y por cliente, buscar y preguntar hablando.

La voz es opcional: todo se puede hacer a mano.

**Datos de prueba inventados** (EMPRESA DEMO PAGUU SL, CIF B00000992). Lo que se escribe se guarda solo en el navegador de cada persona (localStorage). No tiene validez fiscal ni envía nada a Verifactu.

## Pruebas

```
node test/test.js                      # fechas, voz, albaranes, NIF/CIF, totales
NODE_PATH=<carpeta con jsdom> node test/ui-test.js   # interfaz (jsdom, micrófono simulado)
```
