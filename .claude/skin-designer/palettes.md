# Bitácora de paletas — `skin-designer`

Append-only. Entrada más reciente al final. Protocolo y formato en [README.md](./README.md).

Una entrada por invocación del agente, es decir, por juego vestido.

---

## 2026-08-03 — asteroids (y costura de plataforma)

Primera invocación: además de vestir Asteroids se construyó la costura descrita en el README
(`components/games/skins.ts` con `SkinId`/`SKIN_IDS`/`DEFAULT_SKIN`/`SKINS` y el guarda `isSkinId`,
`skin?: SkinId` en `GameCanvasProps`, y el selector de tres botones en el `.hud-actions` de `GamePlayer`
leyendo `localStorage["av_skin"]` en un efecto de solo montaje). La prop es **opcional** para que los tres
juegos aún sin paleta compilen sin tocarlos; el despacho sigue siendo puro `GAME_ENGINES`, sin ninguna rama
por juego.

- **Skins añadidas:** clásico (por defecto), neón, retro

- **Paleta clásica:** transcripción literal de `components/games/asteroids/engine.ts` antes del refactor
  (números de línea del original): fondo `#000` (546) · nave `#fff` (242) · propulsor
  `rgba(255, 130, 0, 0.85)` (261) · bala `#fff` (48) · asteroide `#fff` (108) · power-up `#0ff` (151 trazo,
  156 relleno) · partícula `255,255,255` de `rgba(255,255,255,${alpha})` (298) · HUD `#fff` (513) · texto 3x
  del HUD `#0ff` (526) · icono de vida `#fff` (497) · título de superposición `#fff` (536) · subtítulo
  `rgba(255,255,255,0.65)` (539). `glowBlur: 0`, que hace que `ctx.shadowColor` no tenga efecto alguno: por eso
  `clásico` dibuja exactamente lo mismo que antes.

- **Neón:** los hex de `:root` copiados a mano (el motor no lee variables CSS). Fondo `#0a0a0f` (`--bg`), nave
  `#00f5ff` (`--cyan`), asteroides `#ff006e` (`--magenta`), balas `#f5ff00` (`--yellow`), power-up `#00ff88`
  (`--green`), partículas `230, 233, 255` (`--ink`), HUD `#e6e9ff`, título de game over `#ff006e`,
  `glowBlur: 12`. El criterio fue **un tono por entidad colisionable**: los dos pares que importan
  (nave↔asteroide y bala↔asteroide) nunca comparten color, y el propulsor se quedó en amarillo con el alfa
  0.85 original para que siga leyéndose como llama translúcida y no como una segunda nave.

- **Retro:** fósforo **ámbar**, no verde, por dos razones: el verde ya es un neón del sitio (`--green`) y
  reaparecería como variante de Neón, y el ámbar es el monitor vectorial de la época que este juego imita.
  Cuatro escalones de un solo tono: L4 `#ffe8b0` · L3 `#ffb000` · L2 `#c07800` · fondo `#140d00`. Reparto por
  brillo: nave y balas en L4 (lo del jugador es siempre lo más brillante), power-up en L3, asteroides en L2 —
  cada par que puede colisionar se separa por al menos un escalón completo. HUD en L3 con el contador 3x en L4;
  partículas y propulsor en L3. `glowBlur: 6` como floración suave de fósforo.

- **Sin vestir:** nada. Asteroids es vectorial puro: no hay `drawImage`, sprites ni audio, así que las tres
  skins cubren el 100% de lo que se dibuja. Fuera de alcance por contrato (no por olvido): el marco `.crt`, el
  `.player-hud` de React, `:root` y `.cover-asteroids`.

- **Riesgos:** el brillo se aplica con `glow(ctx, color, palette)` en cada sitio de color en vez de envolver
  los métodos en `save()`/`restore()`. Es deliberado: `PowerUp.draw` fija `textAlign`/`textBaseline` **fuera**
  de su `save()`, y `drawHUD` depende de ese `textBaseline` filtrado; añadir un `restore()` ahí movería
  verticalmente el texto del HUD según hubiera o no un power-up en pantalla. Quien toque este motor debe
  mantener esa fuga de estado tal cual. El único `shadowBlur = 0` explícito está al inicio de `draw()`, antes
  del fondo, para que ningún brillo se arrastre entre fotogramas.

## 2026-08-03 — arkanoid

La costura de plataforma ya existía (construida en la invocación de asteroids); esta ejecución solo tocó
`components/games/arkanoid/skins.ts`, `engine.ts` y `arkanoid-canvas.tsx`. Este era el juego marcado como "el
más difícil" en la tabla de peligros del README: en `clásico` todo lo visible (ladrillos, pala, pelota,
explosión) es `drawImage` sobre `spritesheet-breakout.png`, y el "color" de un ladrillo (`brick.color`) es una
clave del atlas (`red`/`yellow`/`cyan`/`magenta`/`hotpink`/`green`), no un `fillStyle`. Siguiendo la receta del
README, `clásico` conserva el spritesheet (`palette.useSprites = true`) y `neón`/`retro` dibujan cada entidad de
forma procedural (`useSprites = false`): rectángulos para ladrillos y pala, un arco para la pelota, y un
destello procedural que sustituye la animación de explosión de 4 frames del sprite. Teñir uniformemente el
lienzo auxiliar de `loadSpritesheet` se descartó, tal como advierte el README: colapsa los seis tonos de fila
en uno y destruye la distinción entre filas — en vez de eso, `neón`/`retro` ignoran el spritesheet por completo
en modo procedural.

- **Skins añadidas:** clásico (por defecto), neón, retro

- **Paleta clásica:** transcripción literal de `components/games/arkanoid/engine.ts` antes del refactor: fondo
  `#000` (línea 466 pre-refactor) · HUD `#fff` (línea 432) · velo de fin de partida `rgba(0, 0, 0, 0.7)` (línea 450) · título y subtítulo de fin de partida `#fff` (líneas 453/459, ambos con el mismo `fillStyle`, sin
  atenuar el subtítulo — a diferencia de asteroids, el arkanoid original nunca distinguió título de subtítulo
  por brillo, así que `clásico` no lo inventa). Ladrillos, pala, pelota y explosión siguen sin tocar: siguen
  siendo `drawSprite`/`drawFrame` exactos, y los campos de paleta correspondientes (`brickColors`, `paddle`,
  `ball`, `explosionFlash`) llevan los nombres de color del propio atlas como documentación, pero nunca se leen
  porque `useSprites` es `true`. `glowBlur: 0` para que `ctx.shadowColor` no tenga ningún efecto.

- **Neón:** hex de `:root` copiados a mano (el motor no lee variables CSS): fondo `#0a0a0f` (`--bg`), pala
  `#00f5ff` (`--cyan`, la misma familia "jugador" que la nave de asteroids), pelota `#e6e9ff` (`--ink`, para que
  siempre resalte sobre cualquier color de ladrillo detrás), destello de explosión `#f5ff00` (`--yellow`),
  título de fin de partida `#ff006e` (`--magenta`), subtítulo `rgba(230, 233, 255, 0.65)`. Solo hay cuatro
  neones de sitio para seis filas de ladrillos, así que se ciclan (`cyan, magenta, yellow, green, cyan,
magenta`) de forma que dos filas **adyacentes** nunca compartan tono — la distinción fila-contra-fila es
  cosmética, no una pareja que colisiona, así que dos filas no adyacentes pueden repetir hue sin romper la
  puerta de legibilidad. `glowBlur: 10`.

- **Retro:** mismo fósforo ámbar y la misma escala de cuatro escalones ya fijada en asteroids — L4 `#ffe8b0` ·
  L3 `#ffb000` · L2 `#c07800` · fondo `#140d00` — para que "Retro" siga significando lo mismo en todo el
  catálogo. Pala y pelota (las dos entidades del jugador) en L4; las seis filas de ladrillos se aplanan a un
  único `#c07800` (L2): retro distingue por brillo, no por tono, y la identidad de fila es cosmética aquí, así
  que aplanarla es la calibración correcta en vez de inventar una segunda familia de color para conservarla.
  Un escalón completo separa L2 (ladrillos) de L4 (pala/pelota), y otro separa L2 del fondo, así que la puerta
  de legibilidad se cumple igual. HUD en L3, destello de explosión en L4. `glowBlur: 6`.

- **Sin vestir:** los sonidos (`ball-bounce.mp3`, `break-sound.mp3`) no se tocaron — las skins son visuales. La
  animación de explosión de 4 frames del spritesheet solo se ve en `clásico`; `neón`/`retro` la sustituyen por
  un destello procedural de una sola fase (fundido lineal de alfa), no por una réplica de 4 frames, porque no
  hay sprite que recolorear en modo procedural. Fuera de alcance por contrato (no por olvido): `.crt`,
  `.player-hud`, `:root` y `.cover-arkanoid`.

- **Riesgos:** `drawExplosions` en modo procedural usa `ctx.globalAlpha` para el fundido y lo restaura a `1`
  inmediatamente después de cada rectángulo — si se añade un nuevo elemento procedural entre `drawExplosions` y
  `drawHud`, debe asumir `globalAlpha` limpio (ya lo está) en vez de asumir que hereda el alfa de la explosión.
  El destello reutiliza `EXPLOSION_DURATION`/`explosion.startTime` sin frames discretos, así que si algún día
  `clásico` cambia esa duración, el fundido procedural la sigue automáticamente sin tocarlo aparte.

## 2026-08-03 — snake

La costura de plataforma ya existía (construida en la invocación de asteroids); esta ejecución solo tocó
`components/games/snake/skins.ts`, `engine.ts` y `snake-canvas.tsx`. Motor de una sola clase, sin clases
auxiliares con `draw(ctx)` propio, así que todo el color se lee directo de `this.palette` sin tener que
enhebrar la paleta como segundo argumento en ningún sitio.

- **Skins añadidas:** clásico (por defecto), neón, retro

- **Paleta clásica:** transcripción literal de `components/games/snake/engine.ts` antes del refactor: fondo
  `#000` (línea 290 pre-refactor) · cabeza `#4ade80` (237) · cuerpo `#16a34a` (237) · rejilla
  `rgba(255,255,255,0.05)` (244) · muro `#4ade80` (262, el mismo verde que la cabeza — así estaba en el
  original, no se corrige aquí) · HUD `#fff` (269) · título de fin de partida `#fff` (280) · subtítulo
  `rgba(255,255,255,0.65)` (284). `glowBlur: 0`, así que `clásico` dibuja exactamente lo mismo que antes.

- **Neón:** hex de `:root` copiados a mano (el motor no lee variables CSS): fondo `#0a0a0f` (`--bg`), cabeza
  `#00ff88` (`--green`), cuerpo `#00f5ff` (`--cyan`), muro `#ff006e` (`--magenta`), HUD `#e6e9ff` (`--ink`),
  título de fin de partida `#ff006e`. A diferencia de clásico, aquí el muro **no** repite el tono de la
  cabeza: la única pareja que puede colisionar en este juego es serpiente-contra-muro (la fruta es un sprite
  sin vestir, ver más abajo), así que se le dio un tono propio en vez de heredar el verde de la cabeza. La
  rejilla se tiñó de un cian tenue (`rgba(0, 245, 255, 0.08)`) en vez de blanco tenue, para que no desentone
  sobre el fondo casi negro. `glowBlur: 12`.

- **Retro:** mismo fósforo ámbar y la misma escala de cuatro escalones ya fijada en asteroids/arkanoid — L4
  `#ffe8b0` · L3 `#ffb000` · L2 `#c07800` · fondo `#140d00`. Cabeza en L4 (lo del jugador, siempre lo más
  brillante), cuerpo en L3, muro en L2: la única pareja que colisiona (cabeza-contra-muro) queda separada por
  dos escalones completos, no solo uno. HUD en L3, título de fin de partida en L4. `glowBlur: 6`.

- **Sin vestir:** el atlas de 22 frutas (`FRUIT_ATLAS`, `/games/snake/fruits.png`) se queda sin teñir en las
  tres skins — sigue siendo el mismo `drawImage` en `drawFood()` sin importar el skin activo. Esto es
  deliberado, tal como advierte el README (tabla de peligros): recolorear un atlas de sprites PNG de forma
  uniforme por skin no es una operación de paleta razonable sin un segundo spritesheet, y el contrato prohíbe
  añadir activos binarios nuevos. La fruta sigue siendo legible en las tres skins porque tiene su propio
  color natural y nunca comparte posición con la serpiente en el mismo frame.

- **Riesgos:** `drawWalls` y `drawHUD` fijan `shadowBlur` al entrar y lo restauran a `0` al salir en vez de
  usar `save()`/`restore()`, igual que en asteroids/arkanoid — es el mismo patrón deliberado, no una omisión.
  `draw()` fuerza `ctx.shadowBlur = 0` justo antes de pintar el fondo para que ningún brillo se arrastre entre
  fotogramas, y como `drawFood()` corre después de `drawWalls()` (que ya restaura `shadowBlur` a 0) y antes de
  `drawSnake()` (que fija el suyo propio), el sprite de la fruta nunca hereda brillo ajeno.
