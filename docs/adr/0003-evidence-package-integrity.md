# ADR 0003: Integridad del Evidence Package

- Estado: Accepted
- Fecha: 2026-06

## Contexto

Los casos necesitan salidas legibles y estructuradas que puedan verificarse despues de una transferencia.

## Decision

Generar representacion canonica, manifiesto, archivos por seccion y hashes SHA-256; ofrecer JSON, HTML, PDF y ZIP segun audiencia.

## Consecuencias

- cualquier regeneracion puede producir nuevos hashes;
- el manifiesto debe viajar con el paquete;
- la integridad no implica veracidad del dato de origen;
- exportaciones deben quedar en Audit Trail;
- secretos y sesion Baileys quedan excluidos.

