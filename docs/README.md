# Documentacion Operativa

Esta carpeta contiene la documentacion viva del proyecto.

## Lectura Recomendada

1. [Deployment Split](deployment-split.md)  
   Define la separacion entre Railway dashboard y Local full.

2. [Local Operation Guide](local-operation-guide.md)  
   Procedimiento local para ejecutar capturas autorizadas, registrar metadata de auditoria y resolver problemas comunes.

3. [Railway Checklist](railway-checklist.md)  
   Checklist de despliegue Railway con variables, volumen de WhatsApp, CORS, token y pruebas de humo.

4. [Planner y Auditoria](../plan.md)  
   Tablero de trabajo, estado actual, epicas, riesgos y verificacion recurrente.

## Principios de Uso

- Railway sirve para dashboard, estadisticas, contactos, reportes, auditoria y persistencia.
- La captura de paquetes se ejecuta en modo local, VM o VPS autorizado.
- Toda captura manual debe incluir `caseId`, operador y nota de autorizacion.
- Los resultados de red se documentan como trafico observado, relays, infraestructura e IPs candidatas.
- Una IP candidata no prueba identidad, ubicacion exacta ni titularidad de una persona.

