# ADR 0002: Captura Local de Metadata

- Estado: Accepted
- Fecha: 2026-06

## Contexto

El analisis necesita observar paquetes de la misma maquina donde corre WhatsApp Web/Desktop, con permisos y driver del sistema.

## Decision

Usar `cap` sobre Npcap/libpcap, exigir metadata de caso y conservar el enfoque en metadata de paquetes. Los filtros visuales no destruyen la observacion original.

## Consecuencias

- privilegios elevados solo para la funcion local;
- dependencia nativa por sistema operativo;
- una captura general y una de llamada por backend;
- necesidad de linea base y lenguaje no concluyente;
- no se admite captura cloud de la red del operador.

