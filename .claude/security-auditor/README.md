# Memoria del agente `security-auditor`

Este directorio es la memoria de largo plazo del agente `security-auditor`
(`.claude/agents/security-auditor.md`). El agente no conserva nada entre sesiones salvo estos archivos, y los
lee **antes** de cualquier respuesta.

## Qué vive dónde

| Archivo               | Qué es                                                                | Mutabilidad                                   |
| ---------------------- | ---------------------------------------------------------------------- | ---------------------------------------------- |
| `README.md`            | Este contrato                                                          | Solo cambia si cambia el protocolo             |
| `audits.md`            | Bitácora de auditorías: qué se revisó, qué se encontró, qué se cerró   | **Append-only**                                |
| `accepted-risks.md`    | Riesgos aceptados a propósito, con motivo y condición de reapertura    | Se añaden filas; solo se retiran al reabrir    |

**El checklist no vive aquí.** Vive en `references/security/security-checklist.md`, en español, junto al
resto de material de referencia de seguridad del proyecto. Es deliberadamente una sola lista: duplicarla aquí
garantiza que las dos copias se desincronicen — la misma razón por la que el backlog del `game-planner` vive
fuera de su propia memoria.

## Formato de `audits.md`

```markdown
## AAAA-MM-DD — <alcance de la auditoría>

- **Alcance:** barrido completo, o las áreas concretas revisadas
- **Estado del checklist:** qué se cerró, qué se reabrió, qué siguió igual
- **Hallazgos nuevos:** uno por línea, con severidad y evidencia (`archivo:línea` o nombre de política)
- **Advisors:** salida de `get_advisors(type:"security")`, resumida
- **Aceptado a propósito:** lo que se movió a `accepted-risks.md`, o "nada"
- **Sin revisar:** qué quedó fuera del barrido y por qué
- **Siguiente paso:** el hand-off concreto (p. ej. `/spec` para una nueva spec de hardening), o "ninguno"
```

La fecha se obtiene con `date +%F`, nunca se adivina. Al ser append-only, una entrada pasada no se edita: se
escribe una entrada nueva que la sustituye y explica qué cambió.

## Formato de `accepted-risks.md`

Una tabla con columnas `Riesgo | Aceptado en | Motivo | Reabrir si`. Un riesgo sin condición de reapertura es
un callejón sin salida que nadie podrá revisar más adelante — el agente debe negarse a registrar uno así sin
antes preguntar qué lo haría cambiar de opinión.

## Reconciliación

Al inicio de cada sesión, después de leer estos archivos, el agente compara el checklist contra la realidad
del repositorio y de la base de datos en vivo (`get_advisors`, `pg_policies`, `pg_proc`) y:

- reabre cualquier ítem cuya evidencia ya no exista en el código o en la base de datos;
- cierra con evidencia fresca cualquier ítem que ya esté resuelto pero siga marcado como abierto;
- nunca borra un ítem: lo cierra, lo reabre, o lo traslada a `accepted-risks.md`.
