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

---

## 2026-08-02 — Primera recomendación: Duelo Pixel (Pong vs CPU)

- **Considerado:** los cuatro placeholders de `app/data/games.ts` que todavía no tienen spec ni
  `components/games/`: `duelo-pixel` (Pong, VERSUS), `invasores` (Space Invaders, SHOOTER), `gloton`
  (Pac-Man, ARCADE) y `ranaria` (Frogger, ARCADE). Confirmé contra `references/implemented-games.md` y
  `specs/` (01 a 09, ninguno más allá de 09) que ninguno de los cuatro está implementado.
- **Decisión:** recomendar `duelo-pixel` como `## Próximo`. Es el único placeholder de categoría VERSUS en
  todo `app/data/games.ts`, y VERSUS no tiene ningún juego jugable en el catálogo real — es el hueco de
  categoría más claro que existe hoy. Además su cover (`.cover-duelo`) ya está escrito en `app/globals.css`
  (líneas 562-572, paletas cian/magenta + pelota amarilla), así que no hay trabajo de diseño pendiente, y no
  requiere ningún asset binario.
- **Por qué:** portabilidad 5/5 (dos rectángulos, un círculo, colisión AABB, sin librería de física);
  balance de catálogo 5/5 (cierra el único hueco de categoría del catálogo); portada 5/5 (ya existe);
  esfuerzo S (más simple que Snake). El único punto débil real es puntuación (4/5, no 5/5): el Pong clásico
  es un partido a N puntos, un resultado binario que no encaja con un leaderboard de enteros ascendentes.
  Documenté como asunción a validar en el spec un modo de supervivencia sin fin (el marcador sube por rally
  ganado, la CPU acelera con el tiempo, termina cuando la CPU anota) — mismo patrón que Arkanoid/Asteroids.
  También noté que la copia del placeholder ("partida local a dos jugadores") es inviable porque la
  plataforma no tiene capa de multijugador; el spec debe recortarla a "contra la CPU", tal como exige el
  contrato de `reference.md` para candidatos VERSUS.
- **Descartados en este ranking (no rechazados, solo por debajo en el backlog):** `invasores` (SHOOTER ya
  tiene a Asteroids; profundiza pero no abre categoría; esfuerzo M por formaciones/escudos), `gloton`
  (ARCADE ya tiene dos; pathfinding de fantasmas con estados es el candidato de mayor riesgo de
  portabilidad, esfuerzo L), `ranaria` (ARCADE ya tiene dos; el esquema de puntaje de Frogger es el que peor
  encaja con una tabla ascendente de los cuatro).
- **Seguimiento:** si `/add-game duelo-pixel` decide no seguir adelante (por ejemplo, si el modo de
  supervivencia sin fin no convence en la fase de diseño), el candidato de respaldo es `invasores`.
