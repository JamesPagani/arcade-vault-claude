# Bitácora de decisiones — `game-planner`

Append-only. Entrada más reciente al final. Protocolo en [README.md](./README.md).

---

## 2026-08-02 — Estado inicial del catálogo

- **Considerado:** el punto de partida del agente. Cuatro juegos jugables en la plataforma (Asteroids,
  Tetris, Arkanoid, Snake, specs 05/07/08/09) y el resto del catálogo como metadata placeholder respaldada
  por la simulación de puntaje de `GamePlayer`.
- **Decisión:** ninguna todavía sobre qué juego sigue. Esta entrada solo fija la línea base.
- **Por qué:** las tres plantillas de `references/templates/started-games/` (asteroids, tetris, arkanoid) ya
  están consumidas. Snake se escribió desde cero sin plantilla, así que todo candidato futuro cae en la rama
  "motor original" de `/add-game`. Eso sube el costo de cada elección y es justo el motivo de existir de esta
  bitácora.
- **Seguimiento:** en la primera sesión real, poblar `## Próximo` y `## Candidatos` en
  `references/game-suggestions-todo.md` con la rúbrica completa.
