# Device Activity Tracker - Planner y Auditoria

Ultima actualizacion: 2026-06-18

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
- [ ] Agregar clasificacion ASN si es viable.
- [ ] Agregar scoring de confianza documentado.
- [ ] Mostrar advertencia tecnica: candidato no equivale a identidad.

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

- [ ] Auditoria TypeScript backend.
- [ ] Auditoria React frontend.
- [ ] Auditoria de seguridad de variables `.env`.
- [ ] Auditoria de dependencias.
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

## Proximo Bloque Sugerido

1. Congelar alcance de features antes de QA manual.
2. Ejecutar checklist Railway.
3. QA manual del flujo local con permisos de captura.
4. Preparar commit/PR cuando el usuario lo pida.
