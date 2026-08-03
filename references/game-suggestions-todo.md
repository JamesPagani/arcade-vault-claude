# Juegos sugeridos — lista de tareas

> Mantenida por el agente `game-planner` (`.claude/agents/game-planner.md`). El backlog vive aquí; el
> historial de decisiones y los descartes están en `.claude/game-planner/`.
>
> Ningún ítem se borra: se promueve a `## Hechos` o se traslada a `.claude/game-planner/rejected.md` con su
> motivo.

Formato de cada ítem:

```markdown
- [ ] **TÍTULO** (`slug`) — CATEGORÍA · color — una línea en español
  - Portabilidad X/5 · Puntuación X/5 · Balance X/5 · Portada X/5 · Esfuerzo: S/M/L
  - Portada: clonar `.cover-<hermano>`
  - Notas: riesgos y decisiones abiertas
  - Siguiente paso: `/add-game slug`
```

## Próximo

- [ ] **DUELO PIXEL** (`duelo-pixel`) — VERSUS · magenta (a confirmar) — dos paletas y una pelota, en solitario
      contra una CPU cada vez más rápida
  - Portabilidad 5/5 · Puntuación 4/5 · Balance 5/5 · Portada 5/5 · Esfuerzo: S
  - Portada: **ya existe** `.cover-duelo` en `app/globals.css` (líneas 562-572) — paletas cian/magenta y
    pelota amarilla sobre una red punteada. No hace falta clonar nada, `/add-game` solo debe referenciarlo.
  - Notas:
    - `app/data/games.ts` ya trae este mismo juego como placeholder (`id: "duelo-pixel"`, `cat: "VERSUS"`,
      `cover: "cover-duelo"`) — es el **único** placeholder con categoría VERSUS en todo el archivo, lo que
      confirma que es el hueco más obvio del catálogo: la categoría VERSUS no tiene ningún juego jugable
      todavía (`references/implemented-games.md` no lista ninguno).
    - El placeholder describe "modo solitario contra la CPU o partida local a dos jugadores" — la segunda
      mitad es inviable: la plataforma no tiene capa de multijugador (ver `reference.md` del skill
      `add-game`, sección de contrato). El spec debe recortar la copia a solo "contra la CPU".
    - Riesgo de encaje con `scores`: el Pong clásico es un partido a N puntos (resultado binario
      gana/pierde), lo cual encaja mal con una tabla de puntaje ascendente. Propongo, como asunción a
      validar en el spec, un modo de **supervivencia sin fin**: el marcador sube por cada rally ganado
      contra una CPU que acelera con el tiempo, y la partida termina cuando la CPU anota. Esto sí produce
      un entero ascendente razonable para el leaderboard, en la línea de Arkanoid/Asteroids/Snake.
    - Motor: dos rectángulos (paleta jugador/CPU) + un círculo (pelota), colisión AABB simple, sin librería
      de física. La IA de la paleta CPU persigue la posición `y` de la pelota con una imperfección/retraso
      calibrado para que sea vencible. Nada de esto rompe el contrato de un solo canvas.
    - El campo `color` del placeholder dice `cyan`, pero cian ya está usado dos veces (Arkanoid, Asteroids)
      y magenta no aparece en ningún juego shippeado — recomiendo pedirle a `/add-game` que lo reasigne a
      `magenta` para balancear la rotación de colores; el cover ya usa ambos tonos así que el cambio es solo
      de metadata, no de CSS.
  - Siguiente paso: `/add-game duelo-pixel`

## Candidatos

- [ ] **INVASORES** (`invasores`) — SHOOTER · verde (a confirmar) — oleadas de alienígenas en formación,
      cañón horizontal con escudos
  - Portabilidad 4/5 · Puntuación 5/5 · Balance 3/5 · Portada 5/5 · Esfuerzo: M
  - Portada: `.cover-invaders` ya existe en `app/globals.css`, sin trabajo adicional.
  - Notas: SHOOTER solo tiene un juego jugable (Asteroids); esto le da profundidad a la categoría, pero no
    abre un hueco nuevo como Duelo Pixel. Mecánica de formación + escudos destructibles + oleadas que
    aceleran es más trabajo que Snake pero menos que Arkanoid (sin sprites, sin sonido obligatorio si se
    dibuja todo con rectángulos). Placeholder existente en `app/data/games.ts` (`id: "invasores"`,
    `color: "green"` — ya usado por Snake, revisar en el spec).
  - Siguiente paso: candidato de respaldo si Duelo Pixel se descarta en `/add-game`.

- [ ] **GLOTÓN** (`gloton`) — ARCADE · amarillo (a confirmar) — laberinto tipo Pac-Man con fantasmas y
      píldora de poder
  - Portabilidad 3/5 · Puntuación 4/5 · Balance 2/5 · Portada 5/5 · Esfuerzo: L
  - Portada: `.cover-glot` ya existe en `app/globals.css`.
  - Notas: ARCADE ya tiene dos juegos (Arkanoid, Snake); no llena un hueco de categoría. Riesgo de
    portabilidad: pathfinding de 4 fantasmas con estados (persecución/huida) y un laberinto con colisión de
    paredes es sustancialmente más complejo que cualquier motor ya portado — más cerca del extremo grande
    de esfuerzo que Arkanoid. Puntuación encaja bien (puntos por píldora, ascendente). Color amarillo ya
    usado por Tetris.
  - Siguiente paso: no proponer todavía; reevaluar solo si se necesita otro ARCADE tras Duelo Pixel/Invasores.

- [ ] **RANARIA** (`ranaria`) — ARCADE · verde (a confirmar) — cruza autopista y río tipo Frogger
  - Portabilidad 4/5 · Puntuación 2/5 · Balance 2/5 · Portada 5/5 · Esfuerzo: M
  - Portada: `.cover-rana` ya existe en `app/globals.css`.
  - Notas: el más débil de los cuatro. El Frogger clásico premia llegar a la meta (evento binario por
    ronda) y tiempo restante, no una progresión de puntaje que escale de forma interesante en un
    leaderboard compartido — habría que inventar un esquema de puntos más agresivamente que en cualquier
    otro candidato. ARCADE ya tiene dos juegos. Color verde ya usado por Snake.
  - Siguiente paso: mantener en el fondo del backlog salvo que surja una idea de puntaje más sólida.

## Hechos

- [x] **ASTEROIDS** (`asteroids`) — SHOOTER · cyan — spec 05
- [x] **TETRIS** (`tetris`) — PUZZLE · yellow — spec 07
- [x] **ARKANOID** (`arkanoid`) — ARCADE · cyan — spec 08
- [x] **SNAKE** (`snake`) — ARCADE · green — spec 09
