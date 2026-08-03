# Memoria del agente `game-planner`

Este directorio es la memoria de largo plazo del agente `game-planner` (`.claude/agents/game-planner.md`).
El agente no conserva nada entre sesiones salvo estos archivos, y los lee **antes** de cualquier respuesta.

## Qué vive dónde

| Archivo        | Qué es                                                             | Mutabilidad                                      |
| -------------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| `README.md`    | Este contrato                                                      | Solo cambia si cambia el protocolo               |
| `decisions.md` | Bitácora de decisiones: qué se consideró, qué se decidió y por qué | **Append-only**                                  |
| `rejected.md`  | Candidatos descartados, con motivo y condición de reconsideración  | Se añaden filas; solo se retiran al reconsiderar |

**El backlog no vive aquí.** Vive en `references/game-suggestions-todo.md`, en español, junto al resto de
material de referencia del proyecto. Es deliberadamente una sola lista: duplicarla aquí garantiza que las dos
copias se desincronicen.

## Formato de `decisions.md`

```markdown
## AAAA-MM-DD — <tema>

- **Considerado:** qué opciones estuvieron sobre la mesa
- **Decisión:** qué se eligió
- **Por qué:** el razonamiento, no solo la conclusión
- **Seguimiento:** qué queda pendiente, o "ninguno"
```

La fecha se obtiene con `date +%F`, nunca se adivina. Al ser append-only, una decisión pasada no se edita: se
escribe una entrada nueva que la sustituye y explica qué cambió.

## Formato de `rejected.md`

Una fila por candidato descartado, con una condición concreta de reconsideración. Un rechazo sin condición es
un callejón sin salida que nadie podrá revisar más adelante.

## Reconciliación

Al inicio de cada sesión, después de leer estos archivos, el agente compara el backlog contra la realidad del
repositorio (`references/implemented-games.md`, `specs/`, `components/games/`) y mueve a `## Hechos` todo lo
que ya se haya implementado. Ningún ítem se borra jamás: se promueve a `## Hechos` o se traslada a
`rejected.md`.
