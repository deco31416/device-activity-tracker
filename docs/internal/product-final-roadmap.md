# WP MONITOR - Roadmap Producto Final 10/10

Ultima actualizacion: 2026-06-29

## Veredicto Actual

Estado actual: beta profesional avanzada / MVP operativo.

Calificacion estimada:

- Arquitectura: 7.5/10
- UX/UI: 8/10
- Valor investigativo: 8/10
- Reporteria y auditoria: 8/10
- Robustez tecnica: 7/10
- Seguridad produccion: 7/10
- Comercializacion: 6.8/10
- Potencial: 9/10

Objetivo: llevar WP MONITOR a producto final 10/10 para piloto institucional controlado, con seguridad, QA, documentacion operativa, reporteria profesional y limites tecnicos explicados.

## Principios de Producto Final

- No prometer capacidades que WhatsApp/Baileys no entrega.
- Separar evidencia observada, inferencia tecnica y conclusion del operador.
- Mantener trazabilidad por caso, operador, autorizacion y hash.
- Priorizar estabilidad, recuperacion y explicabilidad sobre features nuevas.
- Proteger secretos, sesiones, evidencias y datos personales.
- Hacer que un operador no tecnico pueda usar el flujo completo.

## Definicion de Listo 10/10

WP MONITOR se considera producto final cuando:

- Un operador puede instalar, iniciar, conectar WhatsApp, crear caso, monitorear, capturar, revisar y exportar sin ayuda tecnica.
- Railway funciona como dashboard remoto sin captura local.
- Local Full funciona como herramienta completa con captura local y requisitos claros.
- Todos los reportes explican metodologia, limites, hallazgos y anexos.
- Hay roles, autenticacion y control de acceso.
- Hay QA E2E, QA visual, QA operacional y QA de seguridad documentado.
- Los errores criticos muestran mensajes recuperables.
- Las evidencias tienen hash, manifest, retencion y auditoria.

## Backlog Estilo Jira

Estados:

- TODO: pendiente.
- IN PROGRESS: iniciado.
- DONE: completado.
- BLOCKED: bloqueado por decision, dependencia o infraestructura.

Prioridades:

- P0: obligatorio antes de piloto.
- P1: necesario antes de vender como producto.
- P2: mejora profesional.

---

## EPIC-01 - Alcance, Limites y Lenguaje Tecnico

Objetivo: evitar promesas incorrectas y hacer el producto defendible.

### WP-001 - Matriz de capacidades observables

- Estado: TODO
- Prioridad: P0
- Descripcion: documentar que se observa directamente, que se infiere y que no es observable.
- Criterios de aceptacion:
  - Incluye RTT, presence, mensajes, llamadas directas, llamadas de terceros, GeoIP, IP candidata y captura local.
  - UI y reportes usan el mismo lenguaje.
  - Llamadas de terceros quedan marcadas como no observables por Baileys/WhatsApp Web.

### WP-002 - Badges de confianza por senal

- Estado: TODO
- Prioridad: P0
- Descripcion: cada dato operativo debe mostrar confianza: alta, media, baja o no concluyente.
- Criterios de aceptacion:
  - Llamada directa por Baileys: alta.
  - RTT online: media/alta segun muestra.
  - IP candidata: nunca confirma identidad.
  - GeoIP: aproximado y con proveedor.

### WP-003 - Glosario operativo institucional

- Estado: TODO
- Prioridad: P1
- Descripcion: crear glosario corto para operadores y reportes.
- Criterios de aceptacion:
  - Define IP candidata, relay, infraestructura, presence, RTT, evidencia, inferencia y limitacion tecnica.

---

## EPIC-02 - Seguridad, Acceso y Evidencia

Objetivo: proteger datos, sesiones y reportes.

### WP-010 - Autenticacion obligatoria de dashboard

- Estado: TODO
- Prioridad: P0
- Descripcion: exigir token fuerte o login en produccion.
- Criterios de aceptacion:
  - Produccion no arranca sin secreto fuerte.
  - Socket.IO y REST usan el mismo guard.
  - No se permite token por query string.

### WP-011 - Roles y permisos

- Estado: TODO
- Prioridad: P0
- Descripcion: implementar roles admin, operador, auditor y solo lectura.
- Criterios de aceptacion:
  - Admin gestiona configuracion y usuarios.
  - Operador crea casos/capturas/reportes.
  - Auditor consulta y exporta.
  - Solo lectura no modifica ni captura.

### WP-012 - Cifrado de evidencias sensibles

- Estado: TODO
- Prioridad: P1
- Descripcion: cifrar reportes, paquetes ZIP o campos sensibles en reposo.
- Criterios de aceptacion:
  - Evidencia exportada conserva hash verificable.
  - Secretos no aparecen en logs.
  - Claves documentadas por entorno.

### WP-013 - Politica de retencion

- Estado: TODO
- Prioridad: P1
- Descripcion: definir retencion por mediciones, eventos, check-ins, capturas y reportes.
- Criterios de aceptacion:
  - TTL documentado.
  - UI muestra cuando los datos expiran.
  - Export final conserva manifest antes de purga.

---

## EPIC-03 - Estabilidad Operativa Local Full

Objetivo: hacer robusto el uso real en campo.

### WP-020 - Health operacional avanzado

- Estado: TODO
- Prioridad: P0
- Descripcion: mostrar estado de MongoDB, WhatsApp, Npcap/libpcap, permisos, interfaz y puertos.
- Criterios de aceptacion:
  - UI muestra causa y solucion sugerida.
  - `/api/health` incluye estado degradado granular.
  - No se habilita captura si falta driver/permisos.

### WP-021 - Recuperacion de sesion WhatsApp

- Estado: IN PROGRESS
- Prioridad: P0
- Descripcion: estabilizar login, QR, logout, reconexion y rotacion de auth.
- Criterios de aceptacion:
  - QR nuevo aparece tras `401/loggedOut`.
  - Sesion activa se restaura al reiniciar.
  - Logs no imprimen credenciales ni claves.

### WP-022 - Matriz de pruebas de captura

- Estado: TODO
- Prioridad: P0
- Descripcion: probar captura con y sin permisos, interfaz inexistente, cambio de Wi-Fi, captura larga y stop/start repetido.
- Criterios de aceptacion:
  - Cada caso tiene resultado esperado.
  - UI no se queda bloqueada.
  - Logs explican recuperacion.

### WP-023 - Empaque Local Full

- Estado: TODO
- Prioridad: P1
- Descripcion: crear instalacion guiada para Windows y Linux.
- Criterios de aceptacion:
  - Windows documenta Npcap y modo administrador.
  - Linux documenta libpcap/capabilities.
  - Un comando levanta backend/frontend.

---

## EPIC-04 - UX de Operador y Flujo Guiado

Objetivo: que el flujo completo sea entendible sin conocimiento tecnico.

### WP-030 - Asistente de caso

- Estado: TODO
- Prioridad: P0
- Descripcion: crear flujo paso a paso para caso, contacto, autorizacion, monitoreo, captura y reporte.
- Criterios de aceptacion:
  - No permite capturar sin caso y autorizacion.
  - Muestra modo actual: Railway o Local Full.
  - Sugiere siguiente accion.

### WP-031 - Estado de cobertura por contacto

- Estado: TODO
- Prioridad: P0
- Descripcion: mostrar que senales estan disponibles para cada contacto.
- Criterios de aceptacion:
  - RTT activo/inactivo.
  - Presence disponible/no disponible.
  - Llamadas directas observables.
  - Llamadas de terceros no observables.
  - Captura local disponible/no disponible.

### WP-032 - Mensajes de error recuperables

- Estado: TODO
- Prioridad: P1
- Descripcion: reemplazar errores genericos por mensajes operativos.
- Criterios de aceptacion:
  - Cada error incluye causa probable y accion.
  - No expone stack trace al operador.
  - Errores HTTP se traducen en UI.

### WP-033 - QA responsive completo

- Estado: TODO
- Prioridad: P1
- Descripcion: validar desktop, laptop, tablet y mobile.
- Criterios de aceptacion:
  - Sidebar colapsa correctamente.
  - Botones no se pisan.
  - Tablas y report cards no cortan texto critico.

---

## EPIC-05 - Reportes, Auditoria y Cadena de Custodia

Objetivo: generar informes defendibles.

### WP-040 - Reporte ejecutivo institucional

- Estado: TODO
- Prioridad: P0
- Descripcion: mejorar PDF/HTML final con portada, resumen, metodologia, hallazgos, limites, anexos y hashes.
- Criterios de aceptacion:
  - No contiene marca personal no deseada.
  - Incluye WP MONITOR, version, caso y hash.
  - Diferencia evidencia, inferencia y conclusion.

### WP-041 - Timeline unificado de actividad

- Estado: TODO
- Prioridad: P0
- Descripcion: unir RTT, presence, llamadas, mensajes, check-ins, capturas y reportes.
- Criterios de aceptacion:
  - Cada evento tiene timestamp UTC/local.
  - Cada evento tiene fuente y confianza.
  - Exporta JSON/CSV/PDF.

### WP-042 - Evidence Package verificable

- Estado: IN PROGRESS
- Prioridad: P0
- Descripcion: fortalecer ZIP final con manifest, hashes, anexos y versionado.
- Criterios de aceptacion:
  - Hash por archivo.
  - Manifest canonico.
  - Auditoria de exportacion.

### WP-043 - QA visual de PDF/HTML

- Estado: TODO
- Prioridad: P1
- Descripcion: renderizar reportes a PNG y comparar layout.
- Criterios de aceptacion:
  - PDF no corta tablas.
  - HTML no muestra `undefined`, `null`, `NaN` ni `[object Object]`.
  - Fixture estable reproducible.

---

## EPIC-06 - Analytics y Metricas Investigativas

Objetivo: convertir senales en lectura operativa confiable.

### WP-050 - Motor ActivityEvent completo

- Estado: IN PROGRESS
- Prioridad: P0
- Descripcion: consolidar RTT, presence, llamadas y mensajes en una linea de actividad.
- Criterios de aceptacion:
  - RTT no se duplica en `activity_events`.
  - Presence/call/message se persisten.
  - Stats muestra senales observadas separadas de RTT.

### WP-051 - Sesiones combinadas

- Estado: TODO
- Prioridad: P1
- Descripcion: calcular sesiones usando RTT online + presence + llamadas + mensajes.
- Criterios de aceptacion:
  - Muestra sesiones por fuente.
  - No mezcla inferencias sin explicar.
  - Reporte indica metodologia.

### WP-052 - OPSEC score v2

- Estado: IN PROGRESS
- Prioridad: P1
- Descripcion: calcular privacidad con exposiciones realmente observadas.
- Criterios de aceptacion:
  - Descuenta typing solo si hubo composing/recording.
  - Descuenta llamadas solo si hubo eventos de llamada.
  - Explica formula completa.

### WP-053 - Anomalias por senal

- Estado: TODO
- Prioridad: P2
- Descripcion: detectar actividad fuera de patron, picos de llamadas o cambios de comportamiento.
- Criterios de aceptacion:
  - Anomalias incluyen severidad y razon.
  - No marca como certeza lo que es correlacion.

---

## EPIC-07 - Network Monitor y Analisis de Llamada

Objetivo: reducir falsos positivos y mejorar trazabilidad tecnica.

### WP-060 - Correlacion por ventana de llamada

- Estado: TODO
- Prioridad: P0
- Descripcion: puntuar IPs solo dentro de la ventana exacta de llamada autorizada.
- Criterios de aceptacion:
  - Ventana inicio/fin visible.
  - IPs fuera de ventana quedan como ruido general.
  - Reporte separa infraestructura, relays e IPs candidatas.

### WP-061 - Panel de limites de llamada

- Estado: TODO
- Prioridad: P0
- Descripcion: explicar que llamadas directas son observables cuando participa la cuenta monitora; llamadas de terceros no.
- Criterios de aceptacion:
  - Visible en UI de llamada.
  - Incluido en reporte.
  - Sin lenguaje ambiguo.

### WP-062 - DB-IP/GeoIP multi proveedor

- Estado: IN PROGRESS
- Prioridad: P1
- Descripcion: mantener DB-IP como fuente primaria y fallback complementario.
- Criterios de aceptacion:
  - Si proveedores discrepan, no mostrar mapa engañoso.
  - Reporte indica fuente y fecha.
  - GeoIP no se presenta como ubicacion exacta.

---

## EPIC-08 - QA Automatizado y Manual

Objetivo: hacer repetible la calidad antes de cada release.

### WP-070 - Suite Playwright E2E

- Estado: TODO
- Prioridad: P0
- Descripcion: automatizar flujos clave.
- Criterios de aceptacion:
  - Crear caso.
  - Agregar contacto.
  - Ver stats.
  - Crear check-in.
  - Exportar reporte.
  - Navegar responsive.

### WP-071 - Smoke test Local Full

- Estado: TODO
- Prioridad: P0
- Descripcion: script/checklist para validar backend, frontend, WhatsApp, Mongo y captura.
- Criterios de aceptacion:
  - Ejecutable antes de demo.
  - Resultado claro: pass/fail.
  - No toca puertos externos al producto.

### WP-072 - QA operacional con escenarios reales

- Estado: TODO
- Prioridad: P0
- Descripcion: probar casos de campo controlados.
- Criterios de aceptacion:
  - Escribiendo/grabando.
  - Llamada entrante/saliente directa.
  - Llamada no contestada.
  - Timeout/reject.
  - Captura manual y stop.
  - Export final.

### WP-073 - QA de seguridad

- Estado: TODO
- Prioridad: P0
- Descripcion: revisar secretos, logs, auth, CORS, rate limits y acceso a archivos.
- Criterios de aceptacion:
  - No se sube `auth_info_baileys`.
  - No hay secrets en logs.
  - Produccion exige auth.

---

## EPIC-09 - Railway y Despliegue

Objetivo: dejar remoto y local correctamente separados.

### WP-080 - Railway dashboard production-ready

- Estado: TODO
- Prioridad: P0
- Descripcion: validar deploy remoto sin captura local.
- Criterios de aceptacion:
  - `LOCAL_CAPTURE_ENABLED=false`.
  - Network Monitor oculto o degradado.
  - Health operacional.
  - CORS final correcto.

### WP-081 - Volumen y sesion WhatsApp

- Estado: TODO
- Prioridad: P1
- Descripcion: definir si Railway mantiene sesion WhatsApp o solo dashboard.
- Criterios de aceptacion:
  - Decision documentada.
  - Si hay sesion, volumen persistente.
  - Si no hay sesion, UI lo explica.

### WP-082 - Backup y restauracion

- Estado: TODO
- Prioridad: P1
- Descripcion: definir backup de Mongo, evidencias y config.
- Criterios de aceptacion:
  - Procedimiento de restauracion probado.
  - Retencion definida.

---

## EPIC-10 - Comercializacion y Onboarding

Objetivo: que el producto se pueda presentar y operar profesionalmente.

### WP-090 - Guia de operador no tecnico

- Estado: TODO
- Prioridad: P0
- Descripcion: manual paso a paso con capturas y troubleshooting.
- Criterios de aceptacion:
  - Instalar requisitos.
  - Arrancar sistema.
  - Conectar WhatsApp.
  - Crear caso.
  - Monitorear.
  - Capturar llamada.
  - Exportar informe.

### WP-091 - Demo dataset

- Estado: TODO
- Prioridad: P1
- Descripcion: datos de demostracion anonimizados para ventas/entrenamiento.
- Criterios de aceptacion:
  - No contiene datos reales sensibles.
  - Permite mostrar stats, audit trail, check-ins y reportes.

### WP-092 - Checklist de demo

- Estado: TODO
- Prioridad: P1
- Descripcion: checklist antes de mostrar el producto.
- Criterios de aceptacion:
  - Health OK.
  - Mongo OK.
  - WhatsApp OK.
  - Reportes OK.
  - Captura local OK si aplica.

## Orden Recomendado de Ejecucion

1. EPIC-01: alcance y limites.
2. EPIC-02: seguridad P0.
3. EPIC-03: estabilidad Local Full.
4. EPIC-05: reportes y evidencia.
5. EPIC-08: QA automatizado/manual.
6. EPIC-04: UX guiada.
7. EPIC-09: Railway production-ready.
8. EPIC-10: onboarding comercial.

## Riesgos Principales

- Baileys no es API oficial de WhatsApp; algunas senales pueden cambiar o no emitirse.
- Captura local depende de permisos, driver e interfaz.
- GeoIP es aproximado y puede discrepar entre proveedores.
- IP candidata no identifica por si sola a una persona.
- Railway no puede capturar paquetes locales de la maquina del operador.

## Gate Final Antes de Producto 10/10

- [ ] Security review completo.
- [ ] QA E2E completo.
- [ ] QA operacional real con checklist firmado.
- [ ] QA visual de reportes.
- [ ] Documentacion de operador lista.
- [ ] Reporte final institucional aprobado.
- [ ] Politica de retencion definida.
- [ ] Roles/permisos implementados.
- [ ] Deploy Railway validado.
- [ ] Local Full validado en Windows y Linux/VM.
