# Final Report Builder

Ultima actualizacion: 2026-06-18

## Objetivo

Crear un informe final por caso que sea legible para auditoria humana y trazable para revision tecnica.

El informe no reemplaza el `Evidence Package`; lo resume y referencia sus hashes para mantener integridad.

## Salidas

- `GET /api/reports/:caseId/final`
  - Exporta `final-report.json`.
  - Incluye resumen, alcance, hallazgos, timeline, evidencia e integridad.

- `GET /api/reports/:caseId/final.html`
  - Exporta `final-report.html`.
  - Pensado para lectura, archivo e impresion a PDF desde navegador.

- `GET /api/reports/:caseId/final.pdf`
  - Exporta `final-report.pdf`.
  - PDF nativo con portada, metricas, tablas, timeline, hashes y limitaciones.

- `GET /api/evidence/:caseId/package.zip`
  - Incluye tambien `final-report.json`, `final-report.html` y `final-report.pdf`.

## Estructura UX del HTML

1. Portada con caso, estado, fecha, version y marca.
2. Metricas ejecutivas: eventos, evidencias, analisis de llamada y score maximo.
3. Resumen ejecutivo corto.
4. Alcance autorizado.
5. Hallazgos de IP candidata con score y nota tecnica.
6. Timeline de auditoria.
7. Hashes de integridad.
8. Limitaciones tecnicas.

## Reglas de Lenguaje

- Usar `IP observada candidata`.
- Usar `trafico observado`, `relays`, `infraestructura` y `ruta observada`.
- No afirmar identidad, ubicacion exacta ni titularidad.
- GeoIP se presenta como pista tecnica aproximada, no como ubicacion verificada.

## Auditoria

Cada exportacion registra:

- `final_report_json_export_requested`
- `final_report_html_export_requested`
- `final_report_pdf_export_requested`
- `final_report_json_export`
- `final_report_html_export`
- `final_report_pdf_export`

Los eventos `*_requested` se registran antes de construir el archivo para que queden incluidos en la evidencia exportada. Los eventos `*_export` se registran despues como cierre operativo. Tambien se crea enlace de evidencia tipo `report` con hash del informe.

## QA Visual

El PDF se valida renderizando una muestra a PNG y revisando:

- Encabezado, pie de pagina y numeracion.
- Portada, metricas y jerarquia visual.
- Tablas sin texto cortado.
- Continuacion de timeline con encabezado repetido.
- Hashes legibles en monospace.
