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
- `networkCategory` ampliada con cloud/hosting e ISP/unknown no verificado.
- `networkIntelligence` con ASN/ORG heuristico, categoria local, senal de datacenter probable y cautela.
- Penalizacion inicial de puertos STUN/TURN.
- Penalizacion de rangos cloud/CDN/relay/datacenter conocidos localmente.
- UI muestra score, categoria, razones y nota de limitacion.
- UI y reporte final muestran ASN/ORG cuando existe en reglas locales.
- Metodologia documentada en `docs/ip-candidate-scoring.md`.

Pendiente profesional:

- Integrar ASN/ORG con fuente actualizada, categoria de proveedor mas amplia, ventana temporal, correlacion con evento de llamada y presencia de STUN/SRTP.
- Mantener lenguaje: `IP candidata`, `ruta observada`, `no verificada`.

Estado:

- [x] Primera version corregida.

### P2 - Evidence Package necesitaba salida profesional

Archivos: `src/server.ts`, `src/db.ts`, `client/src/components/AuditTrail.tsx`

Ya existe una version JSON y ZIP de `Evidence Package` con manifiesto, caso, enlaces directos de evidencia, auditoria, analisis de llamada vinculados por `callId`, resumen de red, informe final JSON/HTML/PDF, anexos CSV y hashes SHA-256 por seccion/anexo.

Impacto:

- La evidencia esta fragmentada.
- Falta una salida final lista para auditoria interna o revision tecnica.

Pendiente profesional:

- Agregar QA visual del PDF/HTML final con fixtures estables.
- Agregar pruebas HTTP del endpoint de descarga/exportacion.

Estado:

- [x] Primera version JSON/HTML/PDF/ZIP corregida.

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

Correccion aplicada:

- Se creo `client/src/components/CallAnalysisPanel.tsx`.
- Se movieron controles de captura de llamada, resultado, mapa visual de ruta observada, candidatos, infraestructura e historial.
- Se creo `client/src/components/ProfilePanel.tsx`.
- Se movieron perfil, alias editable, perfil de negocio, patrones horarios y score OPSEC.
- Se creo `client/src/components/IntelPanel.tsx`.
- Se movieron perfil de comportamiento, heatmap semanal, estadisticas de sesion, disponibilidad, rutina diaria y anomalias.
- Se creo `client/src/components/ActivityLogPanel.tsx`.
- Se movio el timeline simple de cambios de actividad.
- Se creo `client/src/components/StatsPanel.tsx`.
- Se movieron estadisticas almacenadas y patrones agregados a un panel dedicado.
- `StatsPanel` muestra calidad de muestra, ventana observada, densidad, distribucion total, hora pico, sesion promedio y online estimado.
- Se creo `client/src/components/ActivityJournalPanel.tsx`.
- Se movieron bitacora en tiempo real, paginacion y exportaciones JSON/HTML/PDF desde `ContactCard`.
- `ContactCard.tsx` bajo de ~2460 a ~905 lineas.
- Se mantuvo la orquestacion de estado/sockets en `ContactCard` para limitar el cambio funcional.

Estado:

- [x] Extraccion de llamada, perfil, inteligencia y timeline de actividad aplicada.
- [x] Extraccion y mejora de panel de estadisticas aplicada.
- [x] Extraccion de bitacora/export aplicada.
- [ ] Pendiente revisar si quedan subpaneles menores que ameriten una segunda reduccion.

### P3 - Estadisticas operativas necesitaban mas contexto

Archivos: `src/db.ts`, `src/analytics.ts`, `client/src/components/StatsPanel.tsx`

Fuente actual de datos:

- `measurements`: RTT, estado observado, dispositivos, timestamps y distribucion online/standby/offline.
- `contacts`: perfil local, alias, push name, foto, negocio y estado activo.
- `call_analyses`: resultados de analisis de trafico de llamada autorizada, infraestructura e IPs candidatas.
- `audit_events`: bitacora de acciones por caso.
- `case_evidence_links`: evidencias directas asociadas al caso.

Mejora aplicada:

- El panel `Stats` ya no muestra solo contadores basicos.
- Agrega ventana observada, densidad de mediciones por hora, calidad de muestra, ultimo online relativo, hora pico, sesion promedio y tiempo online estimado.
- Reutiliza `/api/stats/:jid` y `/api/patterns/:jid`, sin crear una fuente paralela de datos.
- Se agrego `src/stats-insights.ts` como motor puro para tendencias 24h/7d/30d, cobertura diaria de 14 dias y confiabilidad de muestra.
- `/api/stats/:jid` mantiene los campos anteriores y agrega `insights` con periodos, cobertura y score de confiabilidad.
- `StatsPanel` visualiza tendencias, cambios contra periodo anterior, cobertura diaria y confiabilidad operativa.
- El Final Report JSON/HTML/PDF incluye una seccion de estadisticas de actividad observada.
- Evidence ZIP incluye `activity-stats.json` y `annexes/activity-stats.csv` con integridad SHA-256.
- Se agregaron pruebas unitarias para el calculo de tendencias/cobertura/confiabilidad.
- Se agrego `scripts/generate-report-fixture.ts` y script `yarn qa:report-fixture` para generar HTML/PDF/ZIP de QA reproducibles.
- El fixture valida secciones clave, artefactos ZIP y PDF multipagina.
- Se valido el PDF con `pypdf`: titulo, estadisticas, hallazgos e integridad presentes.
- Se extrajeron rutas/guard runtime a `src/routes/runtime.ts`.
- Se agregaron pruebas HTTP reales para `/api/runtime-capabilities` y bloqueo/permiso de captura local Railway/local.
- Se agrego `/api/health` publico, sin secretos, con estado operational/degraded.
- `/api/health` reporta MongoDB configurado/conectado, WhatsApp conectado, captura local habilitada y razones de degradacion.
- Se agregaron pruebas HTTP para health operational/degraded y validacion de no filtrado de secretos.

Pendiente profesional:

- Agregar fixture visual de `StatsPanel` si se formaliza QA frontend.
- Agregar prueba HTTP de `/api/stats/:jid` cuando se desacople el acceso a Mongo para fixtures de endpoint.
- Renderizar el PDF fixture a PNG con Poppler (`pdftoppm`) para QA visual final de layout.
- Reiniciar entorno local despues de cambios de runtime para validar `/api/health` contra el proceso real.

Estado:

- [x] Primera mejora UI/API aplicada.
- [x] Inclusion en reporte final y Evidence ZIP aplicada.
- [x] Fixture QA de reporte final aplicado.
- [x] Contrato HTTP runtime/Railway/local aplicado.
- [x] Health check operativo aplicado.

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
- [x] Runner unitario backend `yarn test:unit`.
- [x] Pruebas unitarias para `meta-ip-ranges`, `validation` y Evidence ZIP/Final Report.
- [x] Scoring de llamada extraido a `src/call-scoring.ts`.
- [x] Pruebas unitarias directas para scoring de llamada.
- [x] Logica runtime extraida a `src/runtime.ts`.
- [x] Pruebas de contrato Railway/local para capabilities y captura deshabilitada.
- [x] Panel `Stats` extraido y enriquecido con patrones agregados.
- [x] Motor `stats-insights` con pruebas unitarias para tendencias, cobertura y confiabilidad.
- [x] Tendencias/cobertura/confiabilidad incluidas en reporte final y Evidence ZIP.
- [x] Fixture QA HTML/PDF/ZIP para reporte final.
- [x] Fixture QA reforzado con checks de contenido HTML/PDF, marca, limitaciones y tokens prohibidos.
- [x] Pruebas HTTP runtime/Railway/local.
- [x] Pruebas HTTP para `/api/health`.

## Auditoria de Severidad - Estado Actual

### Validacion Local 2026-06-22

- Backend local activo en `http://127.0.0.1:4000`.
- Frontend local activo en `http://127.0.0.1:4001`.
- `/api/health` responde correctamente sin secretos.
- Estado inicial observado: `degraded` por `mongodb_disconnected`; MongoDB estaba configurado, pero Atlas rechazaba autenticacion.
- Estado corregido: `operational`; MongoDB conectado despues de actualizar `MONGODB_URI` local.
- WhatsApp aparece conectado y captura local habilitada en modo `local-full`.
- QA tecnico: `yarn test:unit` 23/23 OK, `yarn build` backend OK, `npm run build` frontend OK.
- QA reporte: `yarn qa:report-fixture` OK; PDF 2 paginas, HTML/PDF/ZIP con secciones clave y sin placeholders visibles.
- Release prep: version `2.6.0` actualizada en backend, frontend, README, CHANGELOG, Swagger metadata y manifest de evidencia.

### P1 - Bloqueantes de Produccion

Estado: no se detectan P1 nuevos en este bloque.

Razon:

- Las pruebas unitarias agregadas pasan.
- `DASHBOARD_TOKEN` ya evita exposicion publica basica.
- Swagger permanece condicionado fuera de produccion.
- Reportes y Evidence ZIP preservan lenguaje de limitacion tecnica.

### P2 - Riesgos Importantes Antes de QA/Produccion

- `scoreCandidate` y `lookupNetworkIntelligence` ya fueron extraidos a `src/call-scoring.ts` y tienen pruebas unitarias directas.
- Ya existe prueba de contrato runtime/Railway/local para confirmar capacidades esperadas y payload de captura deshabilitada.
- Ya existe prueba HTTP real de runtime/Railway/local sin levantar WhatsApp/captura.
- MongoDB local/Atlas ya conecta en runtime real despues de actualizar `MONGODB_URI`; mantener vigilancia con `/api/health` antes de QA final.
- Falta QA manual de permisos de captura: sin administrador, interfaz inexistente, inicio/stop repetido y captura ocupada.
- `ContactCard` ya bajo bastante, pero aun contiene bitacora/export y varios paneles secundarios; queda deuda P2/P3 de mantenibilidad.

### P3 - Mejoras Recomendadas

- Extraer bitacora/export a componente propio.
- El fixture QA del reporte ya cubre contenido HTML/PDF/ZIP; falta render PNG real para validar layout visual pixel a pixel.
- Agregar contrato documentado de API para runtime, audit, call capture y reports.
- Revisar cobertura de frontend con pruebas ligeras para render de paneles extraidos.
- Agregar QA visual PNG del reporte HTML/PDF con estadisticas cuando Poppler este disponible.
- `pdftoppm/pdfinfo` no esta disponible en la maquina actual; queda pendiente render visual PNG del PDF.

## Proximo Orden Recomendado

1. Ejecutar checklist Railway y QA manual local con captura autorizada.
2. Extraer bitacora/export de `ContactCard` si se mantiene la reduccion de deuda frontend.
3. Instalar/usar Poppler y renderizar PNG del PDF fixture para QA visual real.
5. Congelar alcance v1 antes de QA final.
