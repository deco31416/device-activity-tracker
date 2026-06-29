# Device Activity Tracker - Planner y Auditoria

Ultima actualizacion: 2026-06-28

## Objetivo

Construir y mantener una herramienta local/remota para observabilidad autorizada de actividad WhatsApp, analisis de trafico propio y reportes tecnicos.

El proyecto se divide en dos modos:

- **Railway dashboard**: panel remoto, contactos, estadisticas, bitacora, reportes, historial y persistencia.
- **Local full**: herramienta completa con WhatsApp Web/local, captura de paquetes, analisis de llamada y mapa visual de ruta observada.

Nota tecnica: el sistema debe hablar de "trafico observado", "infraestructura", "relays" e "IPs candidatas". No debe afirmar que una IP identifica con certeza a una persona.

## Estado Actual

- [x] Backend TypeScript compila con `yarn build`.
- [x] Frontend React compila con `pnpm run build`.
- [x] Existe tracker de actividad WhatsApp con Baileys.
- [x] Existe persistencia MongoDB para contactos, mediciones, actividad y analisis.
- [x] Existe modulo `Network Monitor` para captura local.
- [x] Existe modulo `Call Traffic Analysis` para captura durante llamadas.
- [x] Existe modulo `Authorized Check-In` con consentimiento explicito, IP observada, GPS opcional, enriquecimiento GeoIP, auditoria y hash.
- [x] Existe separacion por modo:
  - `DEPLOYMENT_MODE=railway-dashboard`
  - `LOCAL_CAPTURE_ENABLED=false`
  - `DEPLOYMENT_MODE=local-full`
  - `LOCAL_CAPTURE_ENABLED=true`
- [x] Railway oculta/bloquea captura local.
- [x] Frontend oculta `Network Monitor` si el backend no permite captura.
- [x] Panel de llamada local muestra mapa visual de ruta observada.
- [x] Documentacion inicial creada en `docs/deployment-split.md`.
- [x] README, changelog, gitignore y documentacion actualizados con el split Railway/local.
- [x] Docker y docker-compose persisten la sesion WhatsApp en `/app/auth_info_baileys`.
- [x] Clasificacion de red privada `172.16.0.0/12` corregida.
- [x] Guardado de analisis de llamada usa upsert por `callId`.
- [x] Guia operativa local documentada en `docs/local-operation-guide.md`.
- [x] Auditoria severa 2026-06-24 iniciada con hardening de produccion, proxy trust, auth sin query string, rate limit de Check-In, GPS tratado como evidencia declarada y reportes con observaciones no concluyentes separadas.
- [x] Auditoria de dependencias iniciada: overrides aplicados donde son compatibles, frontend prod audit limpio y riesgos residuales documentados.
- [x] Auditoria de codigo pre-QA: corregido consentimiento personalizado en hash/evidencia, aviso tecnico minimo obligatorio no sobreescribible, version de manifest, parsing seguro de env/rate-limit y fallback local de backend a puerto 4000.
- [x] QA documental: aclarada diferencia operativa entre Bitacora, Full Contact Report, historial de llamada, Final Case Report y Evidence Package.
- [x] Network Monitor profesionalizado: backend genera `ipInsights`, filtros consistentes de infraestructura/local, IP Tracker separa preliminares vs infraestructura y se corrigio auto-scroll que atrapaba la vista durante captura.
- [x] Arranque local profesional: `pnpm run dev:local` y tareas VS Code levantan backend/frontend en 4000/4001 con terminales visibles, nombres y logs.
- [x] Hotfix WhatsApp local: sesiones Baileys cerradas con `401/loggedOut` rotan `auth_info_baileys` y regeneran QR automaticamente.
- [ ] Resolver residuales de Baileys/libsignal/protobufjs/music-metadata en rama separada con smoke test real de WhatsApp antes de promover.

## Arquitectura Definida

### Railway Dashboard

Uso:

- Dashboard remoto.
- API Express/Socket.IO.
- MongoDB.
- Contactos.
- Estadisticas.
- Bitacora.
- Reportes.
- Historial.

Variables:

```env
DEPLOYMENT_MODE=railway-dashboard
LOCAL_CAPTURE_ENABLED=false
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://...
MONGODB_DB=activity-tracker
ALLOWED_ORIGINS=https://frontend.up.railway.app
```

Pendiente:

- [x] Definir estrategia final de volumen Railway para `auth_info_baileys`.
- [ ] Validar que el backend Railway no intente capturar paquetes.
- [ ] Validar CORS con dominio final del frontend.
- [ ] Probar login QR/WhatsApp desde despliegue Railway.

### Local Full

Uso:

- WhatsApp Web/local.
- Captura de paquetes.
- Analisis de llamada.
- Mapa visual de flujo observado.
- Reportes tecnicos.

Variables:

```env
DEPLOYMENT_MODE=local-full
LOCAL_CAPTURE_ENABLED=true
PORT=3001
MONGODB_URI=mongodb+srv://...
MONGODB_DB=activity-tracker
```

Pendiente:

- [x] Documentar requisitos Windows: Npcap, permisos administrador, interfaz activa.
- [x] Documentar requisitos Linux/VPS: libpcap, permisos root/capabilities.
- [ ] Probar captura manual desde WhatsApp Web en maquina local autorizada.
- [ ] Probar captura en VPS/VM con navegador y sesion WhatsApp Web.

## Roadmap

### Epica 0 - Producto Profesional y Alcance

- [x] Definir separacion conceptual entre dashboard remoto y captura local.
- [x] Definir lenguaje tecnico: trafico observado, relays, infraestructura e IPs candidatas.
- [x] Documentar que una IP candidata no prueba identidad ni ubicacion exacta.
- [ ] Congelar alcance v1 profesional antes de QA manual.
- [ ] Definir roles: admin, operador, auditor, solo lectura.
- [ ] Definir matriz de permisos por rol.
- [ ] Definir politica de retencion de evidencia y auditoria.
- [ ] Definir plantilla oficial de informe final.

### Epica 9 - Case Management Profesional

- [x] Crear modelo `Case`.
- [x] Crear coleccion MongoDB `cases`.
- [x] Crear endpoints:
  - `POST /api/cases`
  - `GET /api/cases`
  - `GET /api/cases/:caseId`
  - `PATCH /api/cases/:caseId`
  - `POST /api/cases/:caseId/close`
- [x] Crear vista frontend de casos.
- [x] Asociar contactos observados a un caso.
- [x] Asociar capturas de red a un caso.
- [x] Asociar analisis de llamada a un caso.
- [x] Validar que no se capture contra un caso cerrado.
- [x] Registrar cambios de estado del caso en auditoria.

### Epica 10 - Evidence Package

- [x] Exportacion inicial de auditoria por `caseId` con SHA-256.
- [x] Crear entidad `EvidencePackage` v1 en JSON canonico.
- [x] Crear manifiesto con version del software, caso, timestamps, limitaciones y hashes.
- [x] Incluir auditoria.
- [x] Incluir enlaces directos de evidencia del caso.
- [x] Incluir analisis de llamada vinculados por `callId`.
- [x] Incluir resumen de red.
- [x] Incluir reporte final `HTML`.
- [x] Incluir reporte `PDF` nativo.
- [x] Incluir export tecnico `JSON`.
- [x] Crear ZIP final con hashes por archivo.
- [x] Incluir anexos CSV en el Evidence ZIP.
- [x] Incluir hash SHA-256 por anexo CSV.
- [x] Registrar evento `evidence_package_export`.
- [x] Registrar evento `evidence_package_zip_export`.
- [x] Registrar eventos `*_export_requested` antes de construir archivos exportados.
- [x] Mostrar Evidence Package en UI.

### Epica 11 - Scoring Tecnico de IP Candidata

- [x] Clasificacion inicial de Meta/Google/Cloudflare/unknown.
- [x] Extender clasificacion local a GitHub y Akamai/CDN para reducir falsos positivos de infraestructura.
- [x] Confianza inicial `high/medium/low`.
- [x] Convertir confianza a score numerico 0-100.
- [x] Agregar `reasonCodes` explicables.
- [x] Agregar correlacion contextual prefijo telefonico E.164 vs pais GeoIP observado.
- [x] Aplicar topes duros para muestras pequenas: menos de 10 paquetes no puede salir como candidata.
- [x] Mostrar observaciones no concluyentes separadas de IPs candidatas en UI.
- [x] Preservar observaciones no concluyentes en reporte final JSON/HTML/PDF y anexo CSV.
- [x] Agregar ASN/ORG lookup mediante enriquecimiento IP opcional.
- [x] Agregar categoria de red inicial: Meta/relay, STUN/TURN probable, CDN, publica desconocida.
- [x] Ampliar categoria de red: cloud, hosting, ISP, VPN/proxy.
- [ ] Correlacionar candidato con ventana exacta de llamada.
- [x] Detectar STUN/TURN inicial cuando sea visible por puertos conocidos.
- [x] Penalizar proveedores cloud/CDN/VPN/hosting despues del enriquecimiento ASN/ISP/ORG.
- [x] Mostrar disclaimer tecnico junto a cada candidato.
- [x] Documentar metodologia de scoring.
- [x] Documentar limites de correlacion telefonica/geografica y muestras insuficientes.
- [x] Documentar `ipInsights` de Network Monitor como capa preliminar distinta del scoring formal de llamada.

### Epica 12 - Reporte Final Profesional

- [x] Reportes existentes por contacto.
- [x] Crear `Final Report Builder` por caso.
- [x] Portada con caso, operador, fecha, version y hash.
- [x] Resumen ejecutivo.
- [x] Alcance autorizado.
- [x] Timeline de auditoria.
- [ ] Timeline de capturas.
- [x] Tabla de IPs observadas e IPs candidatas.
- [x] Tabla separada de observaciones no concluyentes para evitar ocultar evidencia debil.
- [ ] ASN/ORG completo.
- [x] GeoIP, proveedor, puertos, paquetes y confidence score cuando existan en el analisis.
- [ ] Mapa visual de ruta observada.
- [x] Limitaciones tecnicas.
- [x] Anexo JSON dentro del Evidence ZIP.
- [x] Anexos CSV dentro del Evidence ZIP.
- [x] Export HTML.
- [x] Export PDF.
- [x] Export JSON.
- [x] Registrar `final_report_*_export_requested` antes de construir informes.

### Epica 13 - UX de Centro de Operaciones

- [ ] Crear dashboard de casos activos.
- [ ] Crear flujo guiado de captura:
  - seleccionar caso
  - confirmar autorizacion
  - seleccionar contacto
  - seleccionar tipo de captura
  - iniciar/detener
  - revisar hallazgos
  - generar informe
- [ ] Crear estado visible de modo runtime: Railway dashboard vs Local full.
- [ ] Mostrar recurso ocupado si ya hay captura activa.
- [x] Mejorar panel `Stats` con calidad de muestra, ventana observada, densidad, hora pico, sesion promedio y online estimado.
- [x] Agregar tendencias 24h/7d/30d al panel `Stats`.
- [x] Agregar cobertura diaria de 14 dias al panel `Stats`.
- [x] Agregar confiabilidad de medicion al endpoint `/api/stats/:jid`.
- [x] Incluir tendencias/cobertura/confiabilidad en reporte final JSON/HTML/PDF.
- [x] Incluir `activity-stats.json` y `annexes/activity-stats.csv` en Evidence ZIP.
- [x] Crear fixture QA reproducible para reporte final HTML/PDF/ZIP.
- [x] Validar estructura PDF con `pypdf`: paginas y secciones clave.
- [x] Corregir Network Monitor para que el auto-scroll no bloquee volver arriba durante captura activa.
- [x] Mejorar IP Tracker de Network Monitor con separacion visual entre preliminares, infraestructura y red local.
- [x] Crear script operativo de arranque local con logs separados para backend y frontend.
- [x] Crear tareas VS Code para levantar Local Full Stack en terminales integradas dedicadas.
- [ ] Renderizar PDF a PNG con Poppler para QA visual final.
- [ ] Mejorar mapa visual con timeline.
- [ ] Agregar vista de replay/resumen de sesion.
- [ ] Crear panel de conclusiones tecnicas editables por operador.

### Epica 15 - Authorized Check-In y Ubicacion Consentida

- [x] Definir enfoque profesional: ubicacion/IP solo mediante consentimiento explicito.
- [x] Crear entidad MongoDB `check_ins`.
- [x] Crear indices por `token`, `caseId` y estado/vencimiento.
- [x] Crear token publico URL-safe.
- [x] Crear hash SHA-256 de evidencia del check-in.
- [x] Crear ruta protegida `POST /api/checkins` para generar enlaces.
- [x] Crear ruta protegida `GET /api/checkins` para auditoria operativa.
- [x] Crear pagina publica `GET /checkin/:token`.
- [x] Crear submit publico `POST /public/checkin/:token/submit`.
- [x] Requerir aceptacion explicita antes de enviar evidencia.
- [x] Solicitar GPS solo tras accion visible del usuario.
- [x] Capturar IP observada por servidor, user-agent, idioma, referer y metadatos de navegador.
- [x] Enriquecer IP con GeoIP/ASN/ISP cuando este disponible.
- [x] Registrar `checkin_link_created` en auditoria.
- [x] Registrar `checkin_completed` en auditoria.
- [x] Asociar check-ins al caso como evidencia `check_in`.
- [x] Crear tab frontend `Check-In`.
- [x] Mostrar URL generada, copiar y abrir enlace.
- [x] Mostrar estado, IP, ISP/ORG, GeoIP, permiso GPS y links a Google Maps.
- [x] Agregar pruebas unitarias de token, hash, normalizacion y render seguro.
- [x] Documentar variables y alcance en README/CHANGELOG/.env.example.
- [ ] Probar manualmente desde telefono real en la misma red y desde datos moviles.
- [ ] Incluir check-ins completados en el Final Case Report.
- [ ] Incluir check-ins completados en Evidence ZIP como anexo dedicado.
- [ ] Agregar revocacion manual de enlaces pendientes.
- [ ] Agregar expiracion visual/automatica en dashboard.

### Epica 14 - Auditoria de Codigo Activa

- [x] Crear auditoria de codigo inicial en `docs/code-audit-2026-06-18.md`.
- [x] Corregir token en URL para descargas autenticadas.
- [x] Crear validacion centralizada de entrada v1 sin dependencias externas.
- [x] Validar `caseId`, metadata de captura, alias, JID, limites y tags.
- [x] Extraer Evidence Package, Final Report, ZIP y PDF a `src/evidence-package.ts`.
- [x] Extraer endpoints de Evidence Package y Final Report a `src/routes/reports.ts`.
- [x] Extraer endpoints de auditoria a `src/routes/audit.ts`.
- [x] Extraer endpoints de casos a `src/routes/cases.ts`.
- [x] Extraer panel de analisis de llamada a `CallAnalysisPanel`.
- [x] Extraer panel de perfil a `ProfilePanel`.
- [x] Extraer panel de inteligencia a `IntelPanel`.
- [x] Extraer timeline de actividad a `ActivityLogPanel`.
- [x] Extraer panel de estadisticas a `StatsPanel`.
- [x] Extraer bitacora/export a `ActivityJournalPanel`.
- [ ] Separar paneles restantes de `ContactCard` si se requiere una segunda reduccion.
- [ ] Documentar contrato de API para runtime, audit, call capture y reports.
- [x] Agregar pruebas unitarias para scoring de llamada.
- [x] Agregar runner unitario backend con `tsx --test`.
- [x] Agregar pruebas unitarias para `meta-ip-ranges`.
- [x] Agregar pruebas unitarias para validadores compartidos.
- [x] Agregar pruebas unitarias para Evidence Package ZIP y Final Report Builder.
- [x] Agregar pruebas de contrato runtime Railway/local.
- [x] Agregar pruebas unitarias para tendencias, cobertura y confiabilidad de estadisticas.
- [x] Agregar script `qa:report-fixture` para QA de informe final.
- [x] Agregar pruebas HTTP de endpoints de modo Railway/local.
- [x] Agregar endpoint publico `/api/health` sin secretos.
- [x] Agregar pruebas HTTP para `/api/health` operational/degraded.
- [ ] Agregar prueba manual QA para `/api/runtime-capabilities`.

### Epica 1 - Separacion Railway vs Local

- [x] Agregar flags de modo runtime.
- [x] Agregar `/api/runtime-capabilities`.
- [x] Bloquear endpoints REST de captura en Railway.
- [x] Bloquear eventos Socket.IO de captura en Railway.
- [x] Ocultar `Network Monitor` en modo dashboard.
- [x] Ocultar panel de llamada local si captura no esta disponible.
- [ ] Crear archivo `railway.json` o documentar configuracion exacta en Railway.
- [x] Revisar Dockerfile para persistencia de auth WhatsApp.

### Epica 2 - Mapa Visual de Conexion

- [x] Crear mapa visual basico en panel de llamada.
- [x] Mostrar nodos: equipo local, red/ISP, WhatsApp/Meta, infraestructura, candidatas, contacto via WhatsApp.
- [x] Mostrar relays Meta y conteo de paquetes.
- [ ] Mejorar visual con coordenadas/geolocalizacion cuando existan.
- [ ] Agregar mini-mapa geografico opcional.
- [ ] Agregar filtro por ventana de tiempo de llamada.
- [ ] Exportar mapa en reporte HTML/PDF.

### Epica 3 - Auditoria y Cadena de Custodia

- [x] Agregar `caseId` obligatorio antes de iniciar captura.
- [x] Agregar `operatorName` o usuario operador.
- [x] Agregar campo de autorizacion/motivo.
- [ ] Registrar eventos:
  - inicio de captura
  - fin de captura
  - cambio de contacto
  - exportacion de reporte
  - cambio de alias
  - cambio de filtros
- [ ] Guardar timestamp local y UTC.
- [x] Registrar inicio/fin de captura local y llamada en `audit_events`.
- [x] Guardar timestamp UTC en eventos de auditoria.
- [ ] Calcular hash SHA-256 de reportes exportados.
- [ ] Crear vista `Evidence Package`.
- [ ] Crear exportacion ZIP con JSON, CSV, reporte y hash.
- [x] Crear vista de consulta de auditoria por `caseId`.

### Epica 4 - Analisis de Trafico Local

- [ ] Revisar filtros BPF actuales.
- [ ] Separar captura general de captura de llamada.
- [ ] Agregar whitelist/blacklist de proveedores.
- [ ] Actualizar rangos Meta/WhatsApp.
- [x] Agregar clasificacion ASN si es viable.
- [x] Agregar scoring de confianza documentado.
- [x] Mostrar advertencia tecnica: candidato no equivale a identidad.

### Epica 5 - Reportes

- [ ] Reporte por contacto.
- [ ] Reporte por llamada/interaccion.
- [ ] Reporte de actividad por rango de fecha.
- [ ] Export JSON.
- [ ] Export HTML.
- [ ] Export PDF.
- [ ] Incluir hash, operador, caso y timestamps.
- [ ] Incluir mapa visual de ruta observada.

### Epica 6 - QA y Auditoria de Codigo

- [x] Auditoria TypeScript backend iniciada.
- [x] Auditoria React frontend iniciada.
- [x] Auditoria de seguridad de variables `.env`.
- [x] Auditoria de dependencias iniciada con mitigacion parcial.
- [ ] Migrar frontend fuera de CRA/react-scripts para eliminar residuales `webpack-dev-server`.
- [ ] Auditar upgrade/reemplazo de Baileys/libsignal/protobufjs/music-metadata sin romper QR, presencia, reportes ni llamadas.
- [ ] Auditoria de Dockerfile.
- [ ] Auditoria de Railway deploy.
- [ ] QA responsive frontend.
- [ ] QA sockets reconexion/desconexion.
- [ ] QA MongoDB desconectado.
- [ ] QA captura sin permisos administrador.
- [ ] QA captura con interfaz inexistente.

### Epica 7 - Hallazgos de Auditoria Activa

- [x] Corregir volumen Docker de `/app/baileys_auth_info` a `/app/auth_info_baileys`.
- [x] Corregir `.dockerignore` para excluir `auth_info_baileys`.
- [x] Evitar duplicados nuevos en `call_analyses` usando `updateOne(..., { upsert: true })`.
- [x] Evitar indice unico riesgoso en bases existentes con duplicados historicos.
- [x] Limpiar estado interno si `startCallCapture` falla antes de abrir captura.
- [x] Corregir deteccion de IP privada 172: solo `172.16.0.0/12`.
- [x] Alinear textos internos a "direct-path candidates" / "ruta observada".
- [x] Revisar manejo de errores si `capSession.close()` falla.
- [x] Proteger `stopCapture()` y `stopCallCapture()` ante excepciones de cierre.
- [x] Evitar que eventos `terminate/reject/timeout` no relacionados detengan capturas manuales.
- [x] Estabilizar contador de paquetes de llamada en frontend con `useRef`.
- [x] Proteger endpoints sensibles antes de exponer Railway publicamente.
- [x] Definir token simple `DASHBOARD_TOKEN` para dashboard/API/socket.
- [x] Evitar exposicion publica de `authorizationNote` sin autenticacion.
- [x] Documentar que solo se soporta una captura activa por backend.
- [x] Tipar estructuras del frontend de llamada para reducir `any`.
- [ ] Crear prueba/manual QA para endpoint `/api/runtime-capabilities`.
- [x] Crear UI minima para metadata de auditoria en captura general.
- [x] Crear UI minima para metadata de auditoria en captura de llamada.
- [x] Agregar tab `Audit Trail` para consultar eventos por `caseId`.

### Epica 8 - Preparacion Antes de QA

- [x] Agregar autenticacion minima para API/dashboard.
- [x] Agregar exportacion de auditoria por `caseId`.
- [x] Agregar hash SHA-256 de exportaciones.
- [x] Crear checklist Railway con variables, volumen, dominios y CORS.
- [x] Tipar modelos compartidos de llamada/auditoria.
- [x] Reducir `any` en `ContactCard`, `db.ts` y rutas nuevas.
- [x] Documentar flujo operativo local antes de capturar.
- [x] Agregar Swagger/OpenAPI controlado por `ENABLE_SWAGGER` y bloqueado en produccion.
- [x] Agregar logs profesionales de arranque sin imprimir secretos.
- [x] Extraer validadores compartidos a `src/validation.ts`.
- [ ] Congelar alcance de features antes de QA manual.

## Checklist de Verificacion Recurrente

Antes de cerrar cada bloque de trabajo:

- [ ] `git status --short` revisado.
- [ ] Cambios propios identificados.
- [ ] No se revirtieron cambios ajenos.
- [ ] `yarn build` backend ejecutado si se toca backend.
- [ ] `pnpm run build` frontend ejecutado si se toca frontend.
- [ ] `git diff --check` sin errores reales.
- [ ] Documentacion actualizada si cambia flujo operativo.
- [ ] Riesgos/limitaciones anotados.

## Riesgos y Limitaciones

- Railway no ve interfaces de red locales.
- WhatsApp/WebRTC puede usar relays; no siempre hay ruta directa.
- IP candidata no prueba identidad ni ubicacion exacta.
- Captura requiere permisos elevados.
- Rangos IP de Meta/WhatsApp pueden cambiar.
- MongoDB Atlas requiere manejo cuidadoso de credenciales.
- La sesion Baileys debe persistir para evitar re-login frecuente.

## Registro de Cambios

### 2026-06-18

- [x] Se definio arquitectura Railway dashboard + Local full.
- [x] Se agregaron flags `DEPLOYMENT_MODE` y `LOCAL_CAPTURE_ENABLED`.
- [x] Se agrego endpoint `/api/runtime-capabilities`.
- [x] Se bloqueo captura en modo Railway.
- [x] Se oculto `Network Monitor` cuando no hay captura local.
- [x] Se agrego mapa visual de ruta observada en panel local de llamada.
- [x] Se creo `docs/deployment-split.md`.
- [x] Se actualizo `.env.example`.
- [x] Backend validado con `yarn build`.
- [x] Frontend validado con `pnpm run build`.
- [x] Auditoria inicial iniciada.
- [x] Corregida persistencia de auth Baileys en Docker/Compose.
- [x] Corregida clasificacion privada `172.16.0.0/12`.
- [x] Corregido guardado de analisis de llamada para evitar duplicados nuevos por `callId`.
- [x] Corregida limpieza de estado cuando falla inicio de captura.
- [x] Agregado audit log MongoDB (`audit_events`) para capturas.
- [x] Captura manual exige `caseId`, `operatorName` y `authorizationNote`.
- [x] Agregada vista frontend `Audit Trail`.
- [x] Auditoria pre-continuacion: corregidos cierres de captura, guard de auto-stop y contador de paquetes.
- [x] Agregada autenticacion opcional por `DASHBOARD_TOKEN` para local y Railway.
- [x] Agregada exportacion de auditoria por `caseId` con hash SHA-256.
- [x] Creado checklist Railway 10/10 en `docs/railway-checklist.md`.
- [x] Tipados modelos frontend de llamada/auditoria y persistencia de analisis de llamada.
- [x] Creada guia operativa local con requisitos, flujo, auditoria y limites.
- [x] Actualizados `.gitignore`, `.dockerignore`, `CHANGELOG.md`, `README.md` y `docs/README.md`.
- [x] Creada auditoria de codigo inicial en `docs/code-audit-2026-06-18.md`.
- [x] Agregadas epicas profesionales: Case Management, Evidence Package, scoring de IP candidata, reporte final y UX de centro de operaciones.
- [x] Corregido hallazgo P1: descargas autenticadas ya no exponen token en query params.
- [x] Agregado modelo formal `Case`, endpoints `/api/cases`, vista `Cases` y bloqueo de capturas en casos cerrados/archivados.
- [x] Agregado Swagger `/docs` solo fuera de produccion y logs de arranque `MONITORIZACION-DECO`.
- [x] Agregada coleccion `case_evidence_links` y enlaces directos para capturas de red, analisis de llamada y Evidence Package.
- [x] Asociado contacto observado al caso desde el flujo `add-contact`.
- [x] Extraidos validadores compartidos a `src/validation.ts` y rutas conectadas directamente al modulo comun.
- [x] Validado bloque con `yarn build`, `pnpm run build` y `git diff --check`.
- [x] Agregada inteligencia local ASN/ORG heuristica, penalizacion de cloud/datacenter y visualizacion en UI/reporte final.
- [x] Validado bloque con `yarn build`, `pnpm run build` y `pnpm run build` en `client`.
- [x] Agregados anexos CSV al Evidence ZIP: auditoria, evidencias, llamadas, IPs candidatas y capturas de red.
- [x] Agregado `annexes/csv-integrity.json` con SHA-256 por CSV.
- [x] Extraido `CallAnalysisPanel` desde `ContactCard` para reducir deuda tecnica frontend.
- [x] Extraido `ProfilePanel` desde `ContactCard`; `ContactCard.tsx` queda en ~1750 lineas.
- [x] Extraido `IntelPanel` desde `ContactCard`; `ContactCard.tsx` queda en ~1377 lineas.
- [x] Extraido `ActivityLogPanel` desde `ContactCard`; `ContactCard.tsx` queda en ~1326 lineas.
- [x] Extraido `StatsPanel` desde `ContactCard` y enriquecido con patrones agregados desde `/api/patterns/:jid`.
- [x] Extraido `ActivityJournalPanel` desde `ContactCard`; `ContactCard.tsx` queda en ~905 lineas.
- [x] Agregado `src/stats-insights.ts` para tendencias 24h/7d/30d, cobertura diaria y confiabilidad de muestra.
- [x] Endpoint `/api/stats/:jid` devuelve `insights` sin romper el contrato anterior.
- [x] Final Report incluye seccion de estadisticas de actividad observada.
- [x] Evidence ZIP incluye estadisticas de actividad como JSON y CSV hasheado.
- [x] Agregado `scripts/generate-report-fixture.ts` para generar artefactos QA estables.
- [x] Extraidas rutas/guard runtime a `src/routes/runtime.ts`.
- [x] Agregadas pruebas HTTP para `/api/runtime-capabilities` y bloqueo/permiso de captura local.
- [x] Agregado health check operativo con MongoDB, WhatsApp y captura local sin exponer secretos.
- [x] Extraido scoring de llamada a `src/call-scoring.ts`.
- [x] Agregado script `test:unit` y pruebas Node/tsx para rangos IP, validacion, scoring y report/evidence ZIP.
- [x] Extraida logica runtime a `src/runtime.ts`.
- [x] Agregadas pruebas de contrato Railway/local y payload de captura deshabilitada.
- [x] Validado `yarn test:unit`: 15 pruebas OK.
- [x] Validado `yarn build` backend y `pnpm run build` frontend despues del bloque runtime/auditoria.
- [x] Validado `pnpm run build` frontend despues de mejorar `StatsPanel`.
- [x] Validado `yarn test:unit`: 17 pruebas OK despues de agregar `stats-insights`.
- [x] Validado `yarn build` backend y `pnpm run build` frontend despues de tendencias/cobertura.
- [x] Validado `yarn test:unit`, `yarn build` y `pnpm run build` despues de integrar estadisticas al reporte final.
- [x] Validado `yarn qa:report-fixture`: HTML/PDF/ZIP generados, PDF 2 paginas y secciones clave presentes.
- [x] Validado `yarn test:unit`: 20 pruebas OK con contratos HTTP runtime/Railway/local.
- [x] Validado `pnpm run build` frontend despues de extraer `ActivityJournalPanel`.
- [x] Validado `yarn test:unit`: 23 pruebas OK con `/api/health`.
- [x] Validado `yarn build` backend despues de `/api/health`.
- [x] Backend local levantado en `http://127.0.0.1:4000` por conflicto en `3001`.
- [x] Frontend local levantado en `http://127.0.0.1:4001` apuntando al backend `4000`.
- [x] Validado `/api/health`: responde 503 `degraded` por `mongodb_disconnected` sin exponer secretos; WhatsApp conectado y captura local habilitada.
- [x] Validado `npm run build` frontend con ruta explicita `C:\nvm4w\nodejs\npm.cmd`.
- [x] Reforzado `yarn qa:report-fixture` con checks de contenido HTML/PDF, marca, limitaciones, secciones clave y tokens prohibidos.
- [x] Regenerado fixture QA: PDF 2 paginas, HTML/PDF/ZIP OK, sin `undefined`, `null`, `NaN` ni `[object Object]`.
- [x] Documentado bloqueo de render PNG: `pdftoppm/pdfinfo` no disponible en PATH local.
- [x] Actualizada `MONGODB_URI` local en `.env` y validado `/api/health` en `operational`.
- [x] MongoDB conectado, WhatsApp conectado y captura local habilitada en `http://127.0.0.1:4000`.
- [x] Preparada release `2.6.0` en `package.json`, `client/package.json`, `client/package-lock.json`, README, CHANGELOG, Swagger metadata y evidencia.
- [x] Actualizado README con `/api/health`, CORS local `4000/4001`, Evidence ZIP, QA fixture y changelog `v2.6.0`.
- [x] Actualizado `.env.example` con nota de `ALLOWED_ORIGINS`.
- [x] Validado release prep: `yarn test:unit` 23/23 OK, `yarn build` OK, `yarn qa:report-fixture` OK, frontend `npm run build` OK.
- [x] Corregido bug de UI post-pruebas: frontend puede detectar WhatsApp conectado via `/api/health` si se pierde el evento `connection-open`.
- [x] Validado frontend dev server `http://127.0.0.1:4001` con bundle apuntando a `http://127.0.0.1:4000` y fallback `/api/health`.
- [x] Corregido bug de fotos: Dashboard hidrata contactos activos desde `/api/contacts` para recuperar `profilePic`, alias y nombres guardados aunque no llegue el evento socket.
- [x] Agregado proxy backend `/api/contact/:jid/profile-picture` y UI usando ese endpoint para evitar fallos con URLs externas de WhatsApp.
- [x] Corregido conteo de dispositivos: los JIDs internos `@lid` ya no disparan alerta visible como dispositivos fisicos; UI muestra conteo observable.
- [x] Agregado modulo `Authorized Check-In` con enlace publico de consentimiento explicito, IP observada por servidor, GPS opcional y hash SHA-256 de evidencia.
- [x] Agregado selector de caso activo en Check-In, modo Case ID nuevo y persistencia de pestana activa tras refrescar la pagina.
- [x] Agregados metadatos extendidos de Check-In: dispositivo, OS, navegador, pantalla, viewport, CPU/RAM aproximada, red del navegador, idioma y zona horaria.
- [x] Agregados controles administrativos de Check-In: editar, revocar y eliminar desde MongoDB incluso si ya fue completado.
- [x] Agregado upload de imagen preview y metatags Open Graph/Twitter para enlaces autorizados.
- [x] Agregado constructor basico de landing autorizada: marca, layout, colores, imagen preview y toggle de solicitud GPS.
- [x] Agregada personalizacion de politica cliente: labels publicos, texto de consentimiento, boton, mensaje final y redirect post-check-in con aviso tecnico minimo obligatorio.
- [x] Agregado tiempo real para Check-In con evento Socket.IO `checkins-changed` y polling fallback cada 5s.
- [x] Ajustada UI de resumen Check-In: Plantilla, Marca publica y GPS landing separados para evitar ambiguedad.
- [x] Mejorado Network Monitor investigativo: selector de caso activo, autofill operador/autorizacion, metricas candidatas/infraestructura/UDP y filtros para ocultar Meta/Google/Cloudflare/local.
- [x] Agregado analisis de consistencia Check-In: GeoIP, flags proxy/hosting/mobile, timezone, idioma, GPS vs IP, referer y senales de privacidad.
- [x] Ajustado scoring de llamadas post-enriquecimiento: CDN/cloud/hosting/proxy se recategorizan como infraestructura y se capea su score aunque tengan trafico bidireccional.
- [x] Cambiado enriquecimiento GeoIP a DB-IP como proveedor principal, con ip-api como complemento/fallback tecnico para ASN/ISP/coordenadas/flags.
- [x] Mejorada landing publica Check-In con estilo mas comercial: tipografia fuerte, consentimiento en tarjeta, aviso tecnico separado y CTA pulido.
- [x] Eliminados los cards internos de caso/operador/etiqueta/vencimiento de la landing publica; solo queda el resumen compacto de referencia y vencimiento.
- [x] Reorganizado constructor Check-In en secciones de preview, identidad visual, campos publicos y consentimiento.
- [x] Blindado cierre de captura de llamada: snapshot del contexto de auditoria antes de enriquecimiento asincrono para reducir cruces de `callId`.
- [x] Redisenada vista `Audit Trail` como consola investigativa: selector de casos, resumen operativo, filtros, timeline, tabla tecnica y exportaciones agrupadas.
- [x] Agregada paginacion real al `Audit Trail`: timeline/tabla muestran pagina actual, selector de cantidad y reset al filtrar.
- [x] Agregado sidebar colapsable desktop y drawer movil con estado persistente.
- [x] Corregido fallback frontend API de `localhost:3001` a `localhost:4000` y documentados puertos locales `4000/4001`.
- [x] Documentada limitacion operativa: previews publicos requieren `PUBLIC_BASE_URL` con HTTPS publico; `127.0.0.1` solo funciona localmente.
- [x] Preparada release `2.9.0` en `package.json`, `client/package.json`, `client/package-lock.json`, README, CHANGELOG y planner.
- [x] Reforzadas dependencias con overrides compatibles y separacion frontend de dependencias runtime vs tooling; `pnpm --dir client audit --prod` queda limpio.
- [x] Corregidos residuales backend de `lodash`/`ip-address` y `tar`/`node-gyp` mediante resoluciones compatibles.
- [x] Documentados hallazgos residuales de auditoria: CRA/webpack-dev-server solo dev y backend Baileys/libsignal/protobufjs/music-metadata como upgrade controlado.
- [x] Corregido hallazgo P1 de cadena de custodia Check-In: el texto personalizado aceptado se guarda en `consent.text` y entra al hash.
- [x] Corregido hallazgo P2 de reportes: Evidence Package usa version actual del paquete, no `2.6.0` hardcoded.
- [x] Corregido hallazgo P2 de configuracion: CORS/rate-limit/puerto/token toleran espacios o valores invalidos sin romper arranque.

## Proximo Bloque Sugerido

1. Ejecutar QA manual completo de Check-In en URL publica HTTPS o tunel controlado para validar Open Graph real fuera de localhost.
2. Crear rama tecnica para reemplazar CRA por Vite y cerrar residuales `webpack-dev-server`.
3. Crear rama tecnica para upgrade/reemplazo Baileys/libsignal/protobufjs/music-metadata con smoke test real de WhatsApp.
4. Instalar/usar Poppler para render visual PNG del PDF fixture.
5. Congelar alcance antes de QA final.
