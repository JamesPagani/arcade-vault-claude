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
