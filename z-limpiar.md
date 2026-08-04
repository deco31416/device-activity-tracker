# Limpieza para publicacion open source

Checklist vivo para preparar una copia publica de WP MONITOR sin sesiones, secretos, datos operativos ni artefactos locales.

## Estado actual

- [x] Eliminar `.runtime-logs/` y logs antiguos.
- [x] Eliminar respaldos `auth_info_baileys.logged-out-*`.
- [x] Eliminar respaldos `auth_info_baileys.manual-reset-*`.
- [x] Eliminar `dist/` y `client/build/` generados.
- [x] Eliminar `public/uploads/` con previews de pruebas.
- [x] Eliminar `.yarn/install-state.gz` del control de versiones.
- [x] Eliminar `example.png` porque mostraba la interfaz antigua.
- [x] Sustituir nombres, alias y telefonos reales conocidos en pruebas y ejemplos.
- [x] Reforzar `.gitignore` y `.dockerignore` para secretos y datos operativos.
- [x] Verificar 40/40 pruebas unitarias.
- [x] Verificar 1/1 smoke test frontend.
- [x] Verificar build del backend y frontend.
- [x] Verificar fixture de informes HTML, PDF y ZIP.
- [x] Validar `docker compose config`; la construccion de imagenes queda pendiente de iniciar Docker Desktop.

## Auditoria profunda 2026-08-04

### P0 - Bloquea la publicacion

- [ ] Publicar desde un repositorio nuevo sin copiar `.git/`. La rama actual conserva historial con datos de prueba retirados.
- [ ] Rotar la credencial de MongoDB y cualquier secreto compartido previamente.
- [x] Elegir pnpm 10.12.1 como unico gestor del workspace backend/frontend.
- [x] Generar un unico `pnpm-lock.yaml` raiz y retirar los lockfiles incompatibles.
- [x] Corregir los Dockerfiles para instalar desde el workspace con `pnpm --frozen-lockfile`.
- [x] Completar variables de entorno de Docker Compose cargando el `.env` documentado en el backend.
- [x] Retirar completamente Signal: codigo, sidecar de Compose, variable y dependencia WebSocket directa.
- [x] Resolver la entrada principal: `pnpm start` ejecuta el backend compilado `dist/server.js`.
- [x] Declarar `@hapi/boom` como dependencia directa.
- [ ] Resolver la licencia antes de publicar. `LICENSE` fue ampliada durante esta auditoria con condiciones y avisos adicionales; mezclar esos terminos dentro de MIT puede volver ambiguo el identificador `MIT`. Recomendacion: conservar el texto MIT estandar en `LICENSE` y mover uso autorizado, precision y responsabilidad a `RESPONSIBLE_USE.md` o `LEGAL_NOTICE.md`, previa revision legal.

### P1 - Limpieza del producto versionado

- [x] Eliminar la CLI antigua `src/index.ts` y dejar la interfaz web como entrada soportada.
- [x] Retirar `qrcode-terminal` y `@types/qrcode-terminal`.
- [x] Eliminar `client/src/logo.svg`; no tenia referencias.
- [x] Eliminar los logos React `client/public/logo192.png` y `logo512.png`.
- [x] Corregir `client/public/manifest.json` con metadata de WP MONITOR.
- [x] Limpiar comentarios de plantilla en `client/public/index.html` y dejar metadata de WP MONITOR.
- [x] Eliminar `client/src/reportWebVitals.ts` y `web-vitals`.
- [x] Eliminar `client/src/App.css`; estaba vacio y no se importaba.
- [x] Sustituir `client/src/App.test.tsx` por un smoke test real de la pantalla de conexion.
- [x] Conservar Testing Library para el smoke test frontend.
- [x] Cambiar `CONTRIBUTING.md` para documentar WP MONITOR y pnpm.
- [ ] Alinear nombre y descripcion de `package.json` con WP MONITOR sin perder atribucion del autor ni URL del repositorio nuevo.
- [x] Fijar Baileys al commit comprobado `0af2386292907f7d9742d8d41f830d8c48208fa1`.
- [x] Restringir scripts de build de pnpm a Baileys, `cap`, `esbuild` y `protobufjs`.
- [x] Inventariar advertencias heredadas de CRA: `pnpm audit --prod` queda limpio y el arbol de desarrollo conserva 1 high + 6 moderate para migracion controlada a Vite.
- [ ] Confirmar si Redis, Groq y Resend forman parte del producto. Actualmente solo aparecen en logs de arranque; no existe implementacion funcional asociada.
- [ ] Revisar los origenes CORS heredados de puertos 3000/3001 y conservar unicamente los necesarios.
- [ ] Agregar usuario no-root y endurecimiento basico a las imagenes Docker.
- [x] Incluir dependencias de compilacion de `cap` y activos `public/` en la imagen backend.

### P1 - Documentacion que no deberia viajar automaticamente

- [x] Crear `docs/internal/documentation-plan.md` con arquitectura, instalacion, operacion, seguridad, evidencia, calidad y diagramas Mermaid requeridos.
- [x] Ejecutar el plan maestro y dejar una documentacion extensa que permita instalar, levantar y operar WP MONITOR desde cero.
- [x] Mantener alineacion orientativa con ISO/IEC/IEEE 42010:2022, ISO/IEC 25010:2023, ISO/IEC 27001:2022 e ISO/IEC 27037:2012 sin afirmar certificacion.
- [ ] Retirar `plan.md` del repositorio publico o convertirlo en un roadmap corto. Es un tablero interno de aproximadamente 34 KB.
- [x] Mover `docs/internal/code-audit-2026-06-18.md` fuera del recorrido publico principal; sus hallazgos vigentes pueden convertirse en issues.
- [ ] Decidir si `docs/internal/product-final-roadmap.md` viajara en el repositorio publico; contiene un backlog interno amplio y muchas tareas TODO.
- [x] Organizar las guias vigentes dentro de `docs/operations` y `docs/reference`, previa revision final.
- [x] Convertir `docs/README.md` en el indice canonico y separar los documentos internos del recorrido publico.
- [ ] Retirar `z-limpiar.md` antes del primer commit publico; es un documento temporal de saneamiento.
- [ ] Revisar `CHANGELOG.md`: conservar historial funcional, pero retirar contradicciones antiguas si confunden el estado actual.

### P2 - Basura exclusivamente local

- [ ] Eliminar `.agents/`; actualmente esta vacio y ya esta ignorado.
- [ ] Eliminar `node_modules/` raiz al terminar QA. Ocupa aproximadamente 212 MB y se regenera.
- [ ] Eliminar `client/node_modules/` al terminar QA. Es la mayor parte de los aproximadamente 835 MB del directorio `client`.
- [ ] Eliminar `.env` solo despues de migrar de forma segura los valores necesarios y rotar credenciales.
- [ ] Eliminar `auth_info_baileys/` solo al terminar QA o antes de entregar/copiar la carpeta. Contiene la sesion activa.
- [ ] No copiar la carpeta `.git/`, actualmente de aproximadamente 9 MB.

### Archivos revisados que se conservan

- [x] `public/favicon.ico` y `client/public/favicon.ico`: ambos corresponden al favicon actual y son necesarios para backend/landing y frontend.
- [x] `.vscode/tasks.json`: util para el arranque explicito en puertos 4000/4001; conservar despues de unificar el gestor de paquetes.
- [x] `scripts/start-local.ps1`: arranque local explicito, con proteccion contra ejecuciones duplicadas.
- [x] `.env.example`: no contiene la credencial real de MongoDB; requiere una ultima revision al cerrar las variables soportadas.

### Datos de ejemplo revisados

- [x] No quedan nombres, alias o telefonos reales conocidos en la version actual.
- [x] Los telefonos restantes pertenecen a fixtures sinteticos o ejemplos de formato.
- [x] Las IP publicas usadas en tests no estan asociadas a una persona dentro del codigo actual.
- [ ] Sustituir ejemplos numericos por rangos/documentacion reservada cuando sea posible para evitar que parezcan datos reales.

## Nunca copiar al repositorio nuevo

- [ ] `.git/`: contiene todo el historial anterior, incluidos datos de prueba ya retirados.
- [ ] `.env` y cualquier `.env.*` real.
- [ ] `auth_info_baileys/`: contiene la sesion activa y credenciales de WhatsApp.
- [ ] `auth_info_baileys.*` y cualquier respaldo de autenticacion.
- [ ] `.runtime-logs/`, `logs/` y archivos `*.log`.
- [ ] `public/uploads/` y archivos cargados durante check-ins.
- [ ] `captures/`, `capture_exports/`, `*.pcap` y `*.pcapng`.
- [ ] `audit_exports/`, `evidence_packages/` y `generated_reports/`.
- [ ] `node_modules/` y `client/node_modules/`.
- [ ] `dist/`, `build/` y `client/build/`.
- [ ] `secrets/`, `*.key`, `*.pem`, `*.p12` y `*.pfx`.
- [ ] `.agents/` y configuraciones personales no necesarias para el producto.

## Conservar solo en esta maquina mientras probamos

- [ ] `.env`: necesario para ejecutar localmente, pero nunca debe publicarse.
- [ ] `auth_info_baileys/`: conservar hasta terminar QA para no perder la sesion activa.
- [ ] `node_modules/` y `client/node_modules/`: conservar temporalmente para no reinstalar durante QA.
- [ ] `.vscode/tasks.json`: revisar y conservar si se desea ofrecer las tareas oficiales de arranque.

## Limpieza pendiente del producto versionado

- [x] Elegir pnpm como unico gestor de paquetes.
- [x] Dejar un solo `pnpm-lock.yaml` raiz para el workspace.
- [x] Agregar `packageManager: pnpm@10.12.1` en `package.json`.
- [x] Alinear Docker, README, CONTRIBUTING y scripts con pnpm.
- [ ] Revisar `plan.md` y auditorias historicas; decidir si pertenecen al producto publico.
- [ ] Revisar documentos fechados dentro de `docs/`; conservar solo los utiles para usuarios y contribuidores.
- [ ] Revisar comentarios y metadata que todavia usen el nombre historico del proyecto.
- [ ] Confirmar que interfaz, Swagger e informes usen `WP MONITOR` como marca de producto.
- [ ] Revisar la licencia MIT y mover avisos de uso responsable a un documento separado si corresponde.
- [ ] Agregar `SECURITY.md` con canal de reporte de vulnerabilidades.
- [x] Revisar Baileys desde GitHub y fijarlo a un commit reproducible.
- [ ] Revisar que `.env.example` contenga solamente valores ficticios y variables necesarias.

## Credenciales y privacidad

- [ ] Rotar la clave de MongoDB antes de publicar, aunque no aparezca en los archivos actuales.
- [ ] Rotar cualquier token o API key que se haya compartido por chat, captura o terminal.
- [ ] Confirmar que `DASHBOARD_TOKEN`, MongoDB, Redis, Groq, Resend y DB-IP no tengan valores reales en Git.
- [ ] Confirmar que no existan nombres, telefonos, JID, IP privadas de terceros, hashes o coordenadas de casos reales.
- [ ] Revisar screenshots, fixtures, PDFs y JSON antes de incluirlos como ejemplos.

## Estrategia recomendada para el repositorio nuevo

- [ ] Terminar y aprobar esta limpieza en la rama de trabajo.
- [ ] Crear una carpeta nueva y vacia fuera de este repositorio.
- [ ] Copiar unicamente archivos versionados y aprobados; no copiar toda la carpeta actual.
- [ ] No copiar `.git/` para evitar trasladar el historial anterior.
- [ ] Inicializar Git desde cero en la carpeta nueva.
- [ ] Crear un primer commit limpio con el producto saneado.
- [ ] Crear un repositorio GitHub nuevo y privado para una revision final.
- [ ] Ejecutar auditoria de secretos sobre el primer commit.
- [ ] Ejecutar pruebas, builds y QA desde una instalacion limpia.
- [ ] Cambiar el repositorio a publico solo despues de aprobar la auditoria final.

## Validacion final 10/10

- [ ] `git status` sin archivos inesperados.
- [ ] Ningun archivo sensible aparece en `git ls-files`.
- [ ] Instalacion desde cero documentada y reproducible.
- [ ] Backend compila y todas las pruebas pasan.
- [ ] Frontend compila sin errores.
- [ ] Arranque local funciona en puertos 4000 y 4001.
- [ ] Railway inicia en modo dashboard sin captura local.
- [ ] Swagger no se expone en produccion.
- [ ] Informes JSON, HTML, PDF y ZIP no contienen datos ni branding obsoleto.
- [ ] Check-in autorizado funciona sin almacenar archivos de prueba en Git.
- [ ] README explica limites tecnicos, consentimiento y uso autorizado.
- [ ] Revision manual del contenido final antes del primer push publico.

## Decisiones pendientes

- Gestor de paquetes oficial: pendiente.
- Documentos historicos que se publicaran: pendiente.
- Politica de seguridad y uso responsable: pendiente.
- Nombre y URL del nuevo repositorio: pendiente.
- Fecha objetivo de publicacion: pendiente.
