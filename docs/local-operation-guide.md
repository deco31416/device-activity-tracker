# Guia Operativa Local

Esta guia cubre el modo **Local full**, pensado para ejecutar la herramienta en una maquina propia, VM o VPS donde exista autorizacion para observar el trafico de red del entorno.

El objetivo tecnico es registrar actividad, capturas autorizadas, auditoria y rutas observadas. El sistema trabaja con trafico observado, infraestructura, relays e IPs candidatas; una IP candidata no identifica con certeza a una persona.

## Requisitos

### Windows

- Node.js compatible con el proyecto.
- Dependencias instaladas en backend y frontend.
- MongoDB accesible si se requiere persistencia completa y auditoria.
- Npcap instalado.
- PowerShell o terminal ejecutada como Administrador para captura de paquetes.
- WhatsApp Web o navegador de llamada ejecutandose en la misma maquina donde corre la captura.

### Linux, VM o VPS

- Node.js compatible con el proyecto.
- Dependencias instaladas en backend y frontend.
- MongoDB accesible si se requiere persistencia completa y auditoria.
- `libpcap` disponible.
- Permisos `root` o capabilities equivalentes para captura de paquetes.
- Navegador/sesion WhatsApp Web ejecutandose en la misma maquina, VM o entorno donde se observa el trafico.

## Variables Locales

Configurar `.env` para modo completo local:

```env
DEPLOYMENT_MODE=local-full
LOCAL_CAPTURE_ENABLED=true
PORT=3001
MONGODB_URI=mongodb+srv://...
MONGODB_DB=activity-tracker
```

Opcionalmente, proteger dashboard, API y sockets con token:

```env
DASHBOARD_TOKEN=un-token-largo-y-privado
```

Si se quiere permitir captura automatica vinculada a eventos de llamada, tambien se deben configurar estos campos:

```env
DEFAULT_CASE_ID=CASO-2026-001
DEFAULT_OPERATOR_NAME=Nombre del operador
DEFAULT_AUTHORIZATION_NOTE=Autorizacion interna o referencia legal
```

Sin esos tres campos, la captura automatica no inicia. La captura manual desde la interfaz siempre exige metadata de auditoria.

## Inicio Local

Backend:

```powershell
yarn start:server
```

Frontend:

```powershell
cd client
pnpm start
```

Abrir:

```text
http://localhost:3000
```

Si `DASHBOARD_TOKEN` esta activo, ingresar el token en la pantalla inicial.

## Flujo Operativo

1. Iniciar backend y frontend.
2. Conectar o validar la sesion WhatsApp.
3. Definir `Case ID`, operador y nota de autorizacion antes de cualquier captura.
4. Confirmar que el equipo/VM tiene permisos de captura.
5. Seleccionar la interfaz de red correcta.
6. Iniciar captura manual.
7. Ejecutar la interaccion autorizada en WhatsApp Web desde la misma maquina.
8. Detener captura.
9. Revisar actividad, mapa de ruta observada, paquetes, relays e IPs candidatas.
10. Consultar `Audit Trail` por `Case ID`.
11. Exportar evidencia/auditoria cuando aplique.

## Captura General

Usar `Network Monitor` para observar trafico local autorizado:

1. Elegir interfaz activa.
2. Completar `Case ID`, operador y autorizacion.
3. Presionar inicio de captura.
4. Detener captura al finalizar la ventana de observacion.
5. Exportar CSV/JSON si se requiere analisis posterior.

## Captura de Llamada

Usar el panel de contacto y la pestana de llamada:

1. Buscar o abrir el contacto.
2. Abrir el panel de analisis de llamada.
3. Completar `Case ID`, operador y autorizacion.
4. Iniciar captura manual.
5. Realizar la llamada o interaccion por WhatsApp Web en la misma maquina.
6. Detener captura.
7. Revisar el mapa visual:
   - este equipo
   - red local/ISP
   - infraestructura WhatsApp/Meta
   - relays o nube
   - IPs candidatas
   - contacto via WhatsApp sin IP verificada

## Auditoria

La vista `Audit Trail` permite consultar eventos por `Case ID`.

Eventos esperados:

- inicio de captura
- fin de captura
- inicio de captura de llamada
- fin de captura de llamada
- exportacion de auditoria

La exportacion de auditoria por caso incluye hash SHA-256 del paquete JSON generado.

## Limitaciones Operativas

- Railway no puede capturar trafico local de tu maquina.
- El modo local requiere permisos elevados de captura.
- Solo se soporta una captura general activa y una captura de llamada activa por backend.
- WhatsApp puede usar relays; por eso el resultado se trata como ruta observada e IPs candidatas.
- Una IP candidata no prueba identidad, ubicacion exacta ni titularidad de una persona.
- VPN, firewall, interfaz incorrecta o llamada hecha desde otra maquina pueden dejar la captura sin paquetes utiles.

## Solucion de Problemas

### No aparecen interfaces

- Verificar Npcap en Windows.
- Ejecutar terminal como Administrador.
- En Linux/VM/VPS, verificar `libpcap` y permisos de captura.

### No aparecen paquetes

- Confirmar que se eligio la interfaz correcta.
- Confirmar que WhatsApp Web corre en la misma maquina observada.
- Revisar VPN, firewall o adaptadores virtuales.
- Repetir con una ventana de captura mas corta y controlada.

### Error 401 o dashboard bloqueado

- Verificar `DASHBOARD_TOKEN`.
- Volver a iniciar sesion en el dashboard con el token correcto.

### WhatsApp pide QR frecuentemente

- Verificar que `auth_info_baileys` persista.
- En Docker/Railway, confirmar volumen montado en `/app/auth_info_baileys`.

