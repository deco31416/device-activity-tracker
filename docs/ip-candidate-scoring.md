# Scoring Tecnico de IP Candidata

Ultima actualizacion: 2026-06-18

## Objetivo

El scoring convierte una IP publica observada durante una ventana de captura autorizada en una evaluacion tecnica explicable de 0 a 100.

El resultado debe leerse como **IP observada candidata**, no como identificacion personal, ubicacion exacta ni titularidad de una persona.

## Entradas actuales

- Proveedor clasificado localmente: Meta, Google, Cloudflare o desconocido.
- Direccion del flujo: entrante, saliente o bidireccional.
- Cantidad de paquetes.
- Bytes totales y tamano promedio.
- Puertos observados.
- Duracion de la ventana de captura.
- Geolocalizacion offline cuando exista en la base local.

## Reglas v1

- IP publica desconocida inicia con score positivo porque no coincide con relays conocidos.
- Infraestructura conocida inicia penalizada y queda limitada a score bajo.
- Trafico bidireccional suma confianza.
- Trafico en una sola direccion resta confianza.
- Mayor volumen de paquetes durante la ventana suma confianza.
- Muy pocos paquetes resta confianza.
- Tamano promedio compatible con trafico UDP/multimedia suma confianza leve.
- Puertos asociados a STUN/TURN/relay restan confianza.
- Alta densidad temporal durante la ventana suma confianza leve.

## Salida

Cada candidato incluye:

- `confidenceScore`: score numerico 0-100.
- `confidence`: `high`, `medium` o `low`, derivado del score.
- `networkCategory`: categoria tecnica inicial.
- `reasonCodes`: razones explicables con delta positivo o negativo.
- `technicalNote`: limitacion tecnica para evitar sobreinterpretacion.

## Interpretacion recomendada

- 75-100: candidato tecnico fuerte, requiere corroboracion.
- 45-74: candidato tecnico medio, evidencia incompleta o mixta.
- 0-44: baja confianza o infraestructura probable.

## Limitaciones

- No hay ASN/ORG lookup en esta version.
- No detecta VPN/proxy/hosting con precision sin fuente externa o base ASN.
- GeoIP es aproximado y puede apuntar a ISP, datacenter, relay o salida NAT.
- WhatsApp puede usar relays, TURN, CDN, NAT y rutas cambiantes.
- La IP candidata no prueba identidad, ubicacion exacta ni propiedad del usuario.

## Pendientes Profesionales

- Integrar ASN/ORG.
- Penalizar hosting, cloud, VPN/proxy y datacenters.
- Correlacionar con subventanas exactas de evento de llamada.
- Agregar pruebas unitarias para cada regla de scoring.
- Incluir tabla de scoring en reporte final HTML/PDF/JSON.
