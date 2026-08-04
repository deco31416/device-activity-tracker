# Indice de Diagramas

Los diagramas Mermaid viven junto al documento canonico que explican para evitar duplicacion.

| Diagrama | Documento |
| --- | --- |
| Contexto general | [Arquitectura](../architecture/README.md#vista-de-contexto) |
| Contenedores logicos | [Arquitectura](../architecture/README.md#contenedores-logicos) |
| Limites de confianza | [Arquitectura](../architecture/README.md#limites-de-confianza) |
| Datos y estados | [Datos y eventos](../architecture/data-and-events.md) |
| Actividad hasta dashboard | [Datos y eventos](../architecture/data-and-events.md#flujo-de-actividad-al-dashboard) |
| Captura y analisis | [Datos y eventos](../architecture/data-and-events.md#flujo-de-captura-y-analisis) |
| Recorrido operativo | [Guia de usuario](../user-guide/README.md#secuencia-operativa-recomendada) |
| Backup/restauracion | [Backup](../operations/backup-recovery.md#procedimiento-de-restauracion) |
| Troubleshooting | [Troubleshooting](../operations/troubleshooting.md#arbol-inicial) |
| Evidencia/custodia | [Cadena de custodia](../security/evidence-and-chain-of-custody.md#ciclo-de-evidencia) |

## Convenciones

- Los nodos externos se nombran por funcion, no por persona real.
- Las flechas indican direccion logica, no necesariamente un protocolo unico.
- MongoDB y volumenes se representan como almacenamiento durable.
- Memoria del proceso no se presenta como persistencia.
- Todo cambio arquitectonico debe actualizar el diagrama y la fecha/version del documento relacionado.

