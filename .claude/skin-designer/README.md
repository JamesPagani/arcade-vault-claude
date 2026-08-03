# Memoria y contrato del agente `skin-designer`

Este directorio es la memoria de largo plazo del agente `skin-designer` (`.claude/agents/skin-designer.md`).
El agente no conserva nada entre sesiones salvo estos archivos, y los lee **antes** de tocar cualquier juego.

## Qué vive dónde

| Archivo       | Qué es                                                | Mutabilidad                        |
| ------------- | ----------------------------------------------------- | ---------------------------------- |
| `README.md`   | Este contrato: qué es una skin y cómo se implementa   | Solo cambia si cambia el protocolo |
| `palettes.md` | Bitácora de paletas: qué juego, qué valores y por qué | **Append-only**                    |

El código de las skins **no vive aquí**. Vive en `components/games/skins.ts` (la costura de plataforma) y en
`components/games/<slug>/skins.ts` (la paleta de cada juego). Este directorio solo guarda el razonamiento, que
es justamente lo que el código no puede contar.

## Las tres skins

Los identificadores son fijos y en inglés (son claves de código); las etiquetas visibles son en español.

| `SkinId`  | Etiqueta  | Qué es                                                                |
| --------- | --------- | --------------------------------------------------------------------- |
| `classic` | `Clásico` | El aspecto que el juego ya tiene hoy. Es el valor por defecto.        |
| `neon`    | `Neón`    | La identidad neón del sitio, aplicada al lienzo.                      |
| `retro`   | `Retro`   | Fósforo de CRT: casi monocromo, ámbar o verde, por niveles de brillo. |

**`Clásico` no es una tarea de diseño, es una transcripción.** Cada valor tiene que ser el literal que ya
está en `engine.ts`, para que la skin por defecto sea demostrablemente idéntica a lo que había antes del
refactor. Si `clásico` cambia de aspecto, el refactor está mal hecho.

**`Neón`** usa los neones que ya define `:root` en `app/globals.css` (`--cyan #00f5ff`, `--magenta #ff006e`,
`--yellow #f5ff00`, `--green #00ff88`) sobre un fondo casi negro, con brillo vía `ctx.shadowColor` /
`ctx.shadowBlur` y no con pasadas de dibujado extra (una pasada extra cuesta rendimiento y cambia el orden de
composición).

**`Retro`** distingue los elementos por **brillo, no por tono**: tres o cuatro escalones de luminancia de una
misma familia (ámbar o verde). Un juego que hoy usa ocho tonos distintos tiene que seguir siendo legible con
esos escalones; si no lo es, la skin está mal calibrada.

Las tres tienen que pasar la **puerta de legibilidad**: cada entidad se distingue del fondo y de las
entidades con las que puede colisionar. Una skin que esconde la pelota es un bug, no un estilo.

## Alcance: solo el lienzo

Una skin cambia **únicamente lo que el motor dibuja** dentro del `<canvas>`: `fillStyle`, `strokeStyle`,
`shadow*` y la elección de sprite. Nunca la geometría, la velocidad, los tiempos, el ritmo de aparición, la
puntuación ni el `snapshot`.

Fuera de alcance, deliberadamente: el marco neón del sitio (`.crt`, `.crt-screen`, `.player-hud`), las
variables de `:root` y las portadas `.cover-<slug>`. La razón está escrita en `specs/07-tetris-integration.md`
(línea 29): la plantilla de Tetris traía su propio interruptor claro/oscuro y se descartó porque un segundo
sistema de temas del sitio entra en conflicto con el que ya existe. Las skins son del juego, no del sitio.

## La costura de plataforma

Se construye **una sola vez**, en la primera invocación que la encuentre ausente, y después no se toca:

1. `components/games/skins.ts` — `SkinId`, `SKIN_IDS`, `DEFAULT_SKIN = "classic"` y `SKINS` con las
   etiquetas en español.
2. `components/games/registry.ts` — `GameCanvasProps` gana `skin: SkinId`. Un solo cambio de tipo llega a los
   cuatro juegos; los que aún no tienen paleta simplemente ignoran la prop.
3. `components/game-player.tsx` — estado `skin` leído de `localStorage["av_skin"]` en un efecto de solo
   montaje, clonando el patrón (y el motivo: evitar desajuste de hidratación) de
   `components/auth-provider.tsx`, que es el único precedente de `localStorage` del repo. Selector de tres
   botones dentro del `.hud-actions` que ya existe, reutilizando las clases `.btn`.
4. `components/games/<slug>/<slug>-canvas.tsx` — acepta `skin`, la pasa al constructor del motor y añade un
   `useEffect` que llama a `engineRef.current?.setSkin(skin)`.

El paso 4 es imperativo y no un remontaje **porque el efecto del bucle `requestAnimationFrame` tiene el array
de dependencias vacío**: el motor se crea una vez y no se vuelve a crear cuando cambian las props. El
precedente exacto es el efecto de `restartSignal` en `components/games/snake/snake-canvas.tsx`.

## La receta por juego

- `components/games/<slug>/skins.ts` — una interfaz `<Slug>Palette` con un campo por elemento dibujado, y
  `<SLUG>_PALETTES: Record<SkinId, <Slug>Palette>`, donde `classic` contiene los literales previos exactos.
- `engine.ts` — el constructor gana un cuarto parámetro opcional `skin: SkinId = "classic"`; se añade un
  campo `private palette` y un método `setSkin(id: SkinId)`. El resto de la superficie del contrato de motor
  (§1 de `.claude/skills/add-game/reference.md`) no cambia. Cada literal pasa a ser `this.palette.*`.
- Cuando la clase de una entidad tiene un `draw(ctx)` sin acceso a la instancia del motor, se amplía a
  `draw(ctx, palette)`. Las clases auxiliares siguen sin exportarse, según §1.

## Peligros por juego

Cada juego cuesta un orden de magnitud distinto. Verificar siempre contra el código, no contra esta tabla.

| Juego       | Trabajo real                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tetris`    | El más fácil: ya existe una paleta real (`COLORS`, 8 piezas, y `GRID_LINE_COLOR`) más tres literales de HUD. Ojo: `drawBlock` lee la constante de módulo y tiene que leer la paleta de la instancia. Hay que vestir también el lienzo de 120×120 de `drawNext`.                                                                                                                                                                                                                                                                                                                                                            |
| `snake`     | Cabeza y cuerpo, rejilla, muro, HUD, superposición y fondo son literales. El atlas de 22 frutas (`FRUIT_ATLAS`, `/games/snake/fruits.png`) **se queda sin vestir en las tres skins**: hay que decirlo explícitamente en la bitácora en vez de teñirlo a medias.                                                                                                                                                                                                                                                                                                                                                            |
| `asteroids` | Vectorial puro, sin imágenes, pero con una docena de sitios repartidos en cinco clases, incluido un `rgba(255,255,255,${alpha})` interpolado que debe conservar su alfa.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `arkanoid`  | El más difícil: **todo lo visible es `drawImage`** desde `spritesheet-breakout.png`, con rectángulos del atlas escritos a mano, y el "color" de un ladrillo es una clave de sprite, no un color. Regla: `clásico` mantiene el spritesheet; `neón` y `retro` dibujan ladrillos, pala y pelota proceduralmente (y un destello procedural en vez de la animación de explosión), bajo un `palette.useSprites`. Teñir el lienzo auxiliar de `loadSpritesheet` de forma uniforme está descartado: colapsa los seis colores de fila en uno y destruye la distinción entre filas. Los sonidos no se tocan: las skins son visuales. |

## Formato de `palettes.md`

```markdown
## AAAA-MM-DD — <juego>

- **Skins añadidas:** clásico (por defecto), neón, retro
- **Paleta clásica:** de dónde salió cada literal (`archivo:línea`)
- **Neón:** los valores y el razonamiento, no solo los hex
- **Retro:** los valores y los escalones de brillo elegidos
- **Sin vestir:** qué quedó fuera a propósito (sprites, sonidos), o "nada"
- **Riesgos:** qué quedó frágil, o "ninguno"
```

La fecha se obtiene con `date +%F`, nunca se adivina. Al ser append-only, una entrada pasada no se edita: se
escribe una nueva que la sustituye y explica qué cambió.
