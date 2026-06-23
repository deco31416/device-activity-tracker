# Scoring Tecnico de IP Candidata

Ultima actualizacion: 2026-06-23

## Objetivo

El scoring convierte una IP publica observada durante una ventana de captura autorizada en una evaluacion tecnica explicable de 0 a 100.

El resultado debe leerse como **IP observada candidata**, no como identificacion personal, ubicacion exacta ni titularidad de una persona.

## Entradas actuales

- Proveedor clasificado localmente: Meta, Google, Cloudflare o desconocido.
- Inteligencia local de red: ASN/ORG heuristico para rangos conocidos.
- Categoria de red: relay/CDN/cloud-hosting/ISP desconocido.
- Senal de datacenter probable.
- Direccion del flujo: entrante, saliente o bidireccional.
- Cantidad de paquetes.
- Bytes totales y tamano promedio.
- Puertos observados.
- Duracion de la ventana de captura.
- Geolocalizacion offline cuando exista en la base local.
- Enriquecimiento externo opcional (`ip-api.com`) con ciudad, region, codigo postal, coordenadas, zona horaria, ISP, organizacion, ASN y senales mobile/proxy/hosting.

## Reglas v1

- IP publica desconocida inicia con score positivo porque no coincide con relays conocidos.
- Infraestructura conocida inicia penalizada y queda limitada a score bajo.
- ASN/ORG o rango asociado a cloud, CDN, relay o datacenter recibe penalizacion.
- IP publica sin match local de ASN/ORG cloud o relay suma una senal leve, pero no concluyente.
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
- `networkIntelligence`: ASN, organizacion, categoria, fuente local, senal de datacenter probable y cautela.
- `ipEnrichment`: datos externos cacheados de geolocalizacion/ISP/ASN cuando el proveedor esta habilitado.
- `reasonCodes`: razones explicables con delta positivo o negativo.
- `technicalNote`: limitacion tecnica para evitar sobreinterpretacion.

## Interpretacion recomendada

- 75-100: candidato tecnico fuerte, requiere corroboracion.
- 45-74: candidato tecnico medio, evidencia incompleta o mixta.
- 0-44: baja confianza o infraestructura probable.

## Limitaciones

- ASN/ORG usa reglas locales heuristicas; no es una consulta WHOIS/BGP en tiempo real.
- No detecta VPN/proxy/hosting con precision sin fuente externa o base ASN actualizada.
- GeoIP es aproximado y puede apuntar a ISP, datacenter, relay o salida NAT.
- `ip-api.com` en modo gratuito usa HTTP y esta sujeto a limites/terminos del proveedor; usarlo como apoyo tecnico, no como evidencia unica.
- Ciudad, codigo postal y coordenadas son ubicacion estimada de red/ISP, no GPS ni ubicacion fisica confirmada.
- WhatsApp puede usar relays, TURN, CDN, NAT y rutas cambiantes.
- La IP candidata no prueba identidad, ubicacion exacta ni propiedad del usuario.

## Pendientes Profesionales

- Integrar fuente ASN/ORG actualizada y cacheada para verificacion formal.
- Ampliar base local de hosting, cloud, VPN/proxy y datacenters.
- Correlacionar con subventanas exactas de evento de llamada.
- Agregar pruebas unitarias para cada regla de scoring.
- Incluir pruebas visuales del bloque ASN/ORG en UI y reportes.
