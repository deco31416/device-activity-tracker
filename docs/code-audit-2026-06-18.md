# Auditoria de Codigo - 2026-06-18

Alcance: revision estatica del bloque Railway/local, auditoria, captura local, analisis de llamada, frontend de captura y documentacion operativa.

Estado general: el proyecto compila y el flujo base esta implementado. La siguiente fase debe fortalecer arquitectura profesional, cadena de custodia, scoring explicable, reportes finales y QA.

## Hallazgos Prioritarios

### P1 - Token en URL para descargas autenticadas

Archivo: `client/src/auth.ts`

La primera implementacion insertaba `DASHBOARD_TOKEN` como query param `?auth=...` para enlaces de descarga. Eso funcionaba, pero en un dashboard publico podia filtrar el token en historial del navegador, logs de proxy, referer headers o capturas de pantalla.

Impacto:

- Riesgo de exposicion del token de dashboard/API.
- Debilita el modelo de seguridad en Railway.

Correccion aplicada:

- Se reemplazaron descargas por `downloadAuthenticatedFile()`.
- Las descargas usan `authFetch()` y `Authorization: Bearer <token>`.
- El archivo se descarga via `Blob` + `URL.createObjectURL()`.
- Se elimino `authUrl()` del frontend.

Estado:

- [x] Corregido.

### P1 - Falta modelo formal de caso

Archivos: `src/server.ts`, `src/db.ts`, `client/src/components/AuditTrail.tsx`

La implementacion inicial usaba `caseId`, `operatorName` y `authorizationNote` como metadata de captura sin entidad formal. Ya se agrego una primera entidad `Case` con estado, autorizacion, fechas, operador principal, cierre y asociacion automatica desde auditoria.

Impacto:

- Dificulta auditoria profesional.
- No hay control de caso abierto/cerrado.
- No hay validacion centralizada de autorizacion.

Correccion aplicada:

- Coleccion MongoDB `cases`.
- Estados: `draft`, `authorized`, `active`, `closed`, `archived`.
- Endpoints `/api/cases`.
- Vista frontend `Cases`.
- Capturas bloqueadas si el caso esta `closed` o `archived`.

Pendiente profesional:

- Asociar evidencia final, reportes y contactos al caso.
- Agregar roles/permisos por caso.
- Agregar historial detallado de cambios de caso.

Estado:

- [x] Primera version corregida.

### P1 - Scoring de IP candidata demasiado simple

Archivo: `src/call-analyzer.ts`

La confianza de IP candidata dependia principalmente de proveedor desconocido, cantidad de paquetes y bidireccionalidad. Ya existe una primera version de scoring numerico 0-100 con razones explicables, categorias iniciales y nota tecnica por candidato.

Impacto:

- Riesgo de sobreinterpretar una IP observada.
- Reportes finales pueden sonar mas concluyentes de lo que permite la evidencia.

Correccion aplicada:

- `confidenceScore` 0-100.
- `reasonCodes` con delta positivo/negativo.
- `networkCategory` inicial.
- Penalizacion inicial de puertos STUN/TURN.
- UI muestra score, categoria, razones y nota de limitacion.
- Metodologia documentada en `docs/ip-candidate-scoring.md`.

Pendiente profesional:

- Integrar ASN/ORG, categoria de proveedor, puertos, ventana temporal, correlacion con evento de llamada y presencia de STUN/SRTP.
- Mantener lenguaje: `IP candidata`, `ruta observada`, `no verificada`.

Estado:

- [x] Primera version corregida.

### P2 - Evidence Package todavia no existe

Archivos: `src/server.ts`, `src/db.ts`, `client/src/components/AuditTrail.tsx`

Ya existe una version JSON y ZIP de `Evidence Package` con manifiesto, caso, enlaces directos de evidencia, auditoria, analisis de llamada vinculados por `callId`, resumen de red, informe final JSON/HTML/PDF y hashes SHA-256 por seccion.

Impacto:

- La evidencia esta fragmentada.
- Falta una salida final lista para auditoria interna o revision tecnica.

Pendiente profesional:

- Incluir anexos CSV cuando exista el generador final de CSV.
- Agregar pruebas automatizadas del PDF builder.

Estado:

- [x] Primera version JSON corregida.

### P2 - Exportacion de auditoria no incluye evento previo de solicitud

Archivo: `src/server.ts`

Los endpoints de exportacion obtenian eventos, calculaban hash y despues registraban el evento final de exportacion. El archivo descargado representaba el estado previo a la descarga.

Impacto:

- Puede haber diferencia entre lo exportado y el historial consultado inmediatamente despues.

Correccion aplicada:

- Se registra `audit_export_requested` antes de construir el audit export.
- Se registra `evidence_package_export_requested` antes del Evidence Package JSON.
- Se registra `evidence_package_zip_export_requested` antes del Evidence Package ZIP.
- Se registra `final_report_json_export_requested`, `final_report_html_export_requested` y `final_report_pdf_export_requested` antes de construir cada informe.
- El evento final `*_export` se mantiene como cierre operativo posterior.
- Se evita crear casos vacios cuando el Case ID no tiene datos exportables.

Estado:

- [x] Corregido.

### P2 - Una captura activa por backend limita operacion profesional

Archivos: `src/packet-capture.ts`, `src/call-analyzer.ts`, `src/server.ts`

El sistema soporta una captura general activa y una captura de llamada activa por proceso. Esta decision esta documentada, pero limita escenarios con multiples operadores/casos.

Impacto:

- No escala a centro de operaciones multi-caso.
- Riesgo de colision entre usuarios conectados al mismo backend local.

Recomendacion:

- Crear `captureSessionId`.
- Asociar sesion a `caseId`, `operatorId`, `targetJid`, interfaz y tipo.
- Implementar locks explicitos y mensajes de UI cuando el recurso esta ocupado.

Estado:

- [ ] Pendiente.

### P2 - Validacion de entrada centralizada pendiente

Archivos: `src/server.ts`, `client/src/components/NetworkMonitor.tsx`, `client/src/components/ContactCard.tsx`

La metadata de auditoria se validaba manualmente con strings. Ya existe una primera capa centralizada en backend para normalizar y validar `caseId`, textos requeridos, JID, limites numericos, tags, aliases y metadata de captura.

Impacto:

- Posibles datos inconsistentes.
- Mas dificil mantener API estable.

Correccion aplicada:

- Helpers de validacion en `src/server.ts`.
- `caseId` normalizado y validado con formato controlado.
- `operatorName`, `authorizationNote`, alias, tags y textos largos limitados.
- Limites de queries acotados para historial, intel, auditoria y exportaciones.
- Capturas REST/socket validan metadata antes de iniciar.
- Eventos socket devuelven errores de validacion estructurados.

Pendiente profesional:

- Agregar schemas con Zod o validadores TypeScript.
- Extraer schemas compartidos backend/frontend.
- Validar filtros BPF/captura con un contrato mas estricto.

Estado:

- [x] Primera version corregida.

### P3 - UI de analisis de llamada necesita reduccion de complejidad

Archivo: `client/src/components/ContactCard.tsx`

`ContactCard` concentra tracker, perfil, intel, actividad, alias, privacidad, anomalias y analisis de llamada. Ya funciona, pero el archivo queda grande y costoso de auditar.

Impacto:

- Mayor riesgo de regresiones visuales.
- Dificulta pruebas unitarias y QA por panel.

Recomendacion:

- Extraer `CallAnalysisPanel`.
- Extraer `CallTrafficMap`.
- Extraer `ActivityLogPanel`, `IntelPanel`, `ProfilePanel`.

Estado:

- [ ] Pendiente.

### P3 - `server.ts` concentra demasiadas responsabilidades

Archivo: `src/server.ts`

El servidor principal acumulaba Swagger, startup logs, validacion, casos, auditoria, Evidence Package, Final Report, ZIP, PDF, capturas, sockets y WhatsApp.

Correccion aplicada:

- Se extrajo Evidence Package, Final Report, render HTML, render PDF y ZIP a `src/evidence-package.ts`.
- Se extrajeron endpoints de Evidence Package y Final Report a `src/routes/reports.ts`.
- Se extrajeron endpoints de auditoria a `src/routes/audit.ts`.
- Se extrajeron endpoints de casos a `src/routes/cases.ts`.
- Se extrajeron validadores compartidos a `src/validation.ts`.
- Las rutas de casos, auditoria y reportes importan validacion desde el modulo comun.
- `server.ts` conserva orquestacion, Swagger/logs de arranque, captura local, sockets y WhatsApp, pero ya no contiene el motor ni las rutas de casos/auditoria/reportes/evidencia.

Pendiente profesional:

- Extraer startup logger/OpenAPI.
- Extraer endpoints legacy de analytics/contactos si se decide seguir reduciendo `server.ts`.

Estado:

- [x] Primera reduccion aplicada.

## Tareas de Auditoria Marcadas Como Completadas

- [x] Separacion Railway/local implementada.
- [x] Captura local bloqueada en Railway.
- [x] Metadata obligatoria para captura manual.
- [x] Audit Trail inicial implementado.
- [x] Exportacion JSON de auditoria con hash SHA-256.
- [x] Documentacion local/Railway creada.
- [x] Docker persiste `auth_info_baileys`.
- [x] Build backend y frontend validados antes del commit `0025d50`.

## Proximo Orden Recomendado

1. Agregar ASN/ORG y clasificacion cloud/hosting/VPN.
2. Extraer componentes grandes del frontend.
3. Agregar pruebas unitarias de scoring, rangos y report builder.
4. Agregar anexos CSV al Evidence Package.
5. Ejecutar QA manual local y Railway.
