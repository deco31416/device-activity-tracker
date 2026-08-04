# Network Monitor y Analisis de Llamadas

Estas funciones solo estan disponibles cuando el backend corre en `local-full` con `LOCAL_CAPTURE_ENABLED=true`. Necesitan autorizacion sobre la maquina y su trafico.

## Requisitos

- WhatsApp Web o Desktop en la misma computadora de captura.
- Interfaz Wi-Fi/Ethernet correcta.
- Npcap con compatibilidad WinPcap en Windows o libpcap en Linux.
- Terminal con privilegios suficientes.
- Case ID, operador y motivo completos.

WP MONITOR no inicia la llamada. El operador la realiza desde WhatsApp Web/Desktop para que el trafico pase por la interfaz capturada.

## Network Monitor

### Flujo

1. selecciona un caso existente;
2. completa metadata de auditoria;
3. elige la interfaz por direccion local;
4. inicia 30 segundos de linea base;
5. confirma que llega el primer paquete;
6. aplica filtros visuales sin eliminar la evidencia original;
7. detiene y exporta JSON/CSV cuando corresponda.

### Pestañas

- **Packets:** metadata temporal, protocolo, origen, destino, tamano, TTL y clasificacion.
- **Statistics:** paquetes, bytes, protocolos y destinos principales.
- **IP Tracker:** IPs publicas enriquecidas y volumen observado.

Si aparece `Todo el trafico visible esta filtrado`, la captura puede seguir activa. Desactiva `solo UDP` u `ocultar infraestructura` para revisar metadata cruda.

## Analisis de llamada

### Practica controlada

1. captura linea base sin llamada;
2. inicia una nueva ventana con Case ID;
3. realiza llamada propia durante 60-90 segundos;
4. contesta o no segun el escenario documentado;
5. detiene desde WP MONITOR;
6. espera el resultado en tiempo real;
7. compara contra linea base.

### Categorias del resultado

| Categoria | Significado |
| --- | --- |
| Red local | Direcciones privadas o del host |
| Meta/relay | Infraestructura reconocida de WhatsApp/Meta |
| Cloud/hosting | Google, Cloudflare, CDN, STUN/TURN u otro proveedor |
| Candidata | IP publica no clasificada como infraestructura que obtuvo score |
| Sin verificar | No existe corroboracion suficiente para atribucion |

## Score de candidata

El score pondera tipo de IP, proveedor, flujo bidireccional, volumen y penalizaciones por muestra pequena. Consulta la [metodologia completa](../reference/ip-candidate-scoring.md).

Reglas de redaccion:

- usa `IP publica observada como candidata tecnica`;
- incluye paquetes, direccion, ASN/ISP, proveedor GeoIP y score;
- declara si existe contradiccion entre prefijo, proveedor o GeoIP;
- no escribas `IP del contacto` sin corroboracion independiente;
- no presentes coordenadas GeoIP como ubicacion del dispositivo.

## GeoIP

DB-IP es la fuente principal para pais/region/ciudad. ip-api complementa ASN, ISP y flags cuando esta disponible. Si proveedores contradicen ciudad/coordenadas, la interfaz debe omitir un mapa enganoso y explicar la discrepancia.

## Resultado `solo relay`

Significa que la ventana observo infraestructura o que ninguna IP alcanzo criterios de candidata. No es un error y no debe corregirse bajando umbrales despues de ver el resultado.

## Fallos frecuentes

| Sintoma | Revision |
| --- | --- |
| Start deshabilitado | Completa caso, operador y motivo; revisa capacidades |
| Cero paquetes | Interfaz, driver, privilegios, VPN y misma maquina |
| Solo TCP/ruido | Verifica ventana, llamada y filtros |
| Resultado no aparece | Revisa Socket.IO y endpoint de stop |
| Muchas IPs cloud | Compara linea base y clasificacion de infraestructura |
| Ciudad incorrecta | GeoIP puede representar el bloque del ISP |

## Criterio de cierre

- ventana corta y marcas de tiempo registradas;
- linea base conservada;
- resultado relacionado con el caso;
- infraestructura no borrada del paquete;
- candidatas descritas como no concluyentes;
- exportacion y auditoria revisadas.

