# ADR 0001: Separacion de Modos de Despliegue

- Estado: Accepted
- Fecha: 2026-06

## Contexto

Un contenedor Railway no puede observar la interfaz Wi-Fi/Ethernet de la computadora del operador. Intentar ejecutar captura alli produciria una falsa expectativa.

## Decision

Definir `local-full` para captura y operacion completa en el host autorizado, y `railway-dashboard` para API, dashboard, tracker, Check-In, persistencia e informes con captura deshabilitada.

## Consecuencias

- la UI consulta capacidades y oculta/bloquea funciones no disponibles;
- Railway usa `LOCAL_CAPTURE_ENABLED=false`;
- la captura permanece cerca de la fuente de red;
- una operacion hibrida requiere transferencia autorizada de resultados, no acceso magico a la NIC remota.

