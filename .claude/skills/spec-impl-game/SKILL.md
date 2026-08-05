---
name: spec-impl-game
description: Implementa un spec de juego aprobado igual que /spec-impl y, al terminar, ejecuta skin-designer y luego mobile-porter sobre el juego, uno detrás de otro.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(cat:*), Bash(ls:*), Bash(npm run build:*), Task
---

# /spec-impl-game — Implementador de specs de juego + reskin + mobile

## Contexto de sesión

Estado actual del repositorio:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles en esta carpeta:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe"`

Specs de game-jam disponibles:
!`ls specs/game-jam/*/ 2>/dev/null || echo "No hay specs/game-jam/ o está vacía"`

Configuración de creación de rama:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (por defecto, sin archivo de config)"`

Motores de juego registrados (fuente de verdad de los slugs jugables):
!`cat components/games/registry.ts 2>/dev/null || echo "No se encontró components/games/registry.ts"`

---

## Qué es este comando

`/spec-impl-game` es `/spec-impl` más dos pasos automáticos al final: cuando el spec implementado
describe un juego jugable, encadena `skin-designer <slug>` y, solo después de que termine,
`mobile-porter <slug>`. Es la cuarta cadena de hand-off del proyecto (junto a `game-planner` →
`/add-game` → `/spec-impl`, `game-jam` → `/spec-impl`, y los agentes sueltos `skin-designer` /
`mobile-porter`), pensada para no olvidar el reskin ni la adaptación móvil tras implementar un
juego nuevo.

Las Fases 1 a 4 son **idénticas** a `/spec-impl` (mismo comportamiento, mismos mensajes, mismos
bloqueos). Las Fases 5 y 6 son nuevas y solo se ejecutan después de completar la Fase 4.

---

## Instrucciones

Sigue estas fases en orden estricto. **No avances a la siguiente fase si la anterior no se
completó correctamente.**

---

### Fase 1 — Identificar el spec

El argumento recibido es: `$ARGUMENTS`

Si `$ARGUMENTS` está vacío:

- Lista los archivos disponibles en `specs/` y en `specs/game-jam/**` (ya los tienes arriba).
- Pide al usuario que indique el nombre exacto del spec.
- Detente y espera respuesta. No continúes.

Si `$ARGUMENTS` tiene un valor:

- Busca el archivo tanto en `specs/` como en `specs/game-jam/*/`. El usuario puede haber escrito
  el nombre completo (`01-mvp-arkanoid`), solo el número (`01`), solo el slug
  (`mvp-arkanoid`), o para game-jam la forma `<juego>/NN-slug` (p. ej.
  `duelo-de-ranas/01-duelo-de-ranas-integration`) o simplemente `NN-slug` si es único en todo el
  árbol de specs.
- Si el nombre coincide con más de un archivo (por ejemplo el mismo número en `specs/` y en un
  subcarpeta de `specs/game-jam/`), muestra los candidatos encontrados y pide al usuario que
  elija.
- Si no encuentras el archivo, muestra los specs disponibles y pide al usuario que corrija el
  nombre.
- Si lo encuentras, continúa a la Fase 2.

---

### Fase 2 — Validar el estado del spec

Lee el archivo del spec localizado en la Fase 1 con la herramienta Read o `cat`.

En el contenido del archivo, busca la línea que contiene el estado del spec. La etiqueta suele
ser `**Status:**` (inglés) o `**Estado:**` (español), pero puede estar en cualquier idioma. Ubícala
por posición (línea de estado cerca del inicio del spec) y por la máquina de estados circundante,
no por la etiqueta exacta.

**Regla absoluta:** Solo puedes continuar si el estado **significa "Aprobado"**, sin importar el
idioma usado.

Trata cualquiera de los siguientes (y sus equivalentes en otros idiomas) como estado **Aprobado**
y continúa:

- Español: `Aprobado`
- Inglés: `Approved`
- Portugués: `Aprovado`
- Francés: `Approuvé`
- Alemán: `Genehmigt`
- Italiano: `Approvato`
- …o cualquier otra palabra en otro idioma que claramente signifique "aprobado"

Cualquier otro valor (Draft / Borrador, In review / En revisión, Implemented / Implementado,
Obsolete / Obsoleto, o cualquier valor no reconocido) significa **detente** y muestra el mensaje
de error de abajo.

| Categoría de estado                                 | Ejemplos (cualquier idioma)                       | Acción                                                             |
| --------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| Aprobado                                            | `Approved`, `Aprobado`, `Aprovado`, `Approuvé`, … | Continúa a la Fase 3.                                              |
| Borrador                                            | `Draft`, `Borrador`, …                            | Detente. Muestra el mensaje de error de abajo.                     |
| En revisión                                         | `In review`, `En revisión`, …                     | Detente. Muestra el mensaje de error de abajo.                     |
| Implementado                                        | `Implemented`, `Implementado`, …                  | Detente. Muestra el mensaje de error de abajo.                     |
| Obsoleto                                            | `Obsolete`, `Obsoleto`, …                         | Detente. Muestra el mensaje de error de abajo.                     |
| Línea de estado no encontrada / valor no reconocido | —                                                 | Detente. El archivo no sigue el formato esperado. Dilo al usuario. |

Si no estás seguro de si un valor significa "aprobado", **no asumas**. Detente y pide al usuario
que aclare o que actualice el spec con el término canónico.

**Mensaje de error estándar cuando el estado no significa Aprobado:**

```
❌ No puedo implementar este spec.

Estado actual: [ESTADO ENCONTRADO]
Solo trabajo con specs cuyo estado significa "Aprobado" (p. ej. `Approved`, `Aprobado`,
o el equivalente en otro idioma).

Para continuar tienes dos opciones:
  1. Si el spec está listo para implementarse, ábrelo y cambia el estado
     a "Aprobado" (o el término equivalente que use tu equipo) manualmente.
     Ese cambio lo hace la persona, no el agente.
  2. Si el spec todavía necesita trabajo, usa /spec [nombre] para retomarlo.
```

No ofrezcas alternativas, no sugieras "puedo empezar igual si quieres". El bloqueo es
intencional.

---

### Fase 3 — Crear la rama git y cambiar a ella

Una vez confirmado que el estado significa `Aprobado`:

1. Deriva el nombre de la rama a partir del nombre completo del archivo del spec, sin la
   extensión. Formato: `spec-NN-slug`. Ejemplos:

   - `01-mvp-arkanoid.md` → rama `spec-01-mvp-arkanoid`
   - `game-jam/duelo-de-ranas/01-duelo-de-ranas-integration.md` → rama
     `spec-01-duelo-de-ranas-integration`

2. Lee el flag `AutoCreateBranch` de la configuración mostrada arriba en el contexto de sesión.

   - Si el archivo de config no existe, el valor falta, o es un valor no reconocido → trátalo
     como `true` (el default).
   - Solo un `false` explícito (en cualquier capitalización) desactiva la creación automática de
     rama.

   **Si `AutoCreateBranch` es `true` (default):** procede sin preguntar.

   - Si la rama **no existe**: créala con `git checkout -b spec-NN-slug`.
   - Si **ya existe**: informa al usuario que la rama ya existía (puede significar que se retoma
     trabajo previo).
   - En ambos casos: cambia a la rama con `git checkout spec-NN-slug` y confirma que el cambio
     fue exitoso antes de continuar.

   **Si `AutoCreateBranch` es `false`:** pregunta antes de tocar git. Muestra:

   ```
   AutoCreateBranch está en false.
   ¿Crear y cambiar a la rama spec-NN-slug? [y/N]
   ```

   - Si el usuario responde **sí**: crea/cambia a la rama exactamente como en el caso `true`.
   - Si el usuario responde **no** o deja vacío: **no crees ninguna rama.** Dile al usuario que
     implementarás en la rama actual (la mostrada en el contexto de sesión) y pide confirmación
     explícita para continuar ahí. No improvises — espera la respuesta.

3. Confirma visualmente al usuario que el spec está listo y qué rama está activa:

   ```
   ✅ Listo para implementar.

   Spec:   specs/NN-slug.md (o specs/game-jam/<juego>/NN-slug.md)
   Rama:   spec-NN-slug  (activa)   (← o la rama actual, si no se creó una nueva)
   Estado: Aprobado   (← repite el valor real encontrado en el spec)
   ```

4. **No empieces a implementar todavía.** Primero muestra el resumen del spec al usuario para que
   lo tenga fresco. Extrae y muestra:
   - El **objetivo** (la línea tras `**Objective:**` / `**Objetivo:**` / equivalente).
   - El **alcance** (la sección `## Scope` / `## Alcance` / equivalente).
   - El **plan de implementación** (la sección con los pasos numerados —
     `## Implementation plan` / `## Plan de implementación` / equivalente).
   - Los **criterios de aceptación** (el checklist — `## Acceptance criteria` /
     `## Criterios de aceptación` / equivalente).

Empareja los encabezados de sección por significado, no por texto exacto — el spec puede estar
escrito en cualquier idioma.

---

### Fase 4 — Implementar paso a paso

Después de mostrar el resumen del spec, dile al usuario:

```
Voy a implementar el spec siguiendo el plan de implementación al pie de la letra.
Haré una pausa después de cada paso para que revises el diff.

¿Empezamos con el Paso 1?
```

Espera confirmación explícita ("sí", "adelante", "dale", o equivalente). No empieces sin ella.

Una vez confirmado, sigue estas reglas durante toda la implementación:

**Una regla por encima de todas:** implementa lo que dice el spec. Si algo del spec te parece
subóptimo, menciónalo como observación pero implementa lo acordado. Los cambios al spec van al
spec, no al código por sorpresa.

**Ritmo de trabajo:**

- Implementa un paso del plan.
- Muestra un resumen de qué archivos tocaste y qué hiciste.
- Di: `Paso N completado. ¿Puedes revisar el diff y avisarme si continúo con el Paso N+1?`
- Espera confirmación antes de continuar.

**Si durante la implementación encuentras una ambigüedad** que el spec no resuelve:

- Detente.
- Describe la ambigüedad con precisión.
- Presenta dos o tres opciones concretas.
- Espera la decisión del usuario.
- No improvises.

**Si el usuario pide algo que está fuera del alcance del spec:**

- Recuérdale que está fuera del alcance de este spec.
- Sugiere anotarlo para el siguiente spec.
- No lo implementes en esta rama.

**Al terminar el último paso**, no muestres el mensaje final de cierre de `/spec-impl` — en su
lugar, continúa directamente a la Fase 5. Di al usuario:

```
✅ Todos los pasos del plan están implementados.

Ahora verifico los criterios de aceptación y preparo el reskin + adaptación móvil del juego.
```

---

### Fase 5 — Verificación y detección del juego

1. Verifica los criterios de aceptación del spec uno por uno contra lo implementado.
2. Corre `npm run build` (la puerta de aceptación del proyecto). Si falla, **detente aquí**:
   muestra el error, no marques el spec como listo, y **no lances ningún agente**. Deja que el
   usuario decida cómo corregirlo antes de reintentar.
3. Si el build pasa, deriva el **slug del juego** que describe el spec: la clave de catálogo
   (`games.id` en Supabase / `app/data/games.ts`) y la clave correspondiente en `GAME_ENGINES`
   (`components/games/registry.ts`, ya está en el contexto de sesión arriba). Para specs de
   game-jam el slug suele coincidir con el nombre de la carpeta bajo `specs/game-jam/`.
4. Comprueba que ese slug existe como clave en `GAME_ENGINES`. Tanto `skin-designer` como
   `mobile-porter` rechazan y no escriben nada si el slug no tiene motor registrado, así que
   valídalo aquí primero:
   - Si no se detecta un slug claro, o no aparece en `GAME_ENGINES` → informa al usuario, **no
     lances ningún agente**, y pídele que confirme o corrija el slug manualmente antes de
     continuar.
5. Si además el spec integra un juego que ya tiene entradas previas en
   `.claude/skin-designer/palettes.md` y/o `.claude/mobile-porter/viewports.md` (mismo slug),
   avísalo al usuario — puede significar que ya se hizo este trabajo — y pide confirmación antes
   de reinvocar los agentes sobre ese slug.
6. Con el slug confirmado, muestra:

   ```
   ✅ Spec implementado y build en verde.

   Juego detectado: <slug>   (entrada en GAME_ENGINES: ✓)

   Ahora ejecutaré, uno detrás de otro:
     1. skin-designer <slug>
     2. mobile-porter <slug>   (solo cuando el primero termine)

   ¿Continúo? [y/N]
   ```

   - Si el usuario responde que no (o deja vacío) → termina con el mensaje final estándar:
     recuerda actualizar el `**Status:**` del spec a "Implementado" y hacer el commit final antes
     de mezclar la rama. No lances agentes.
   - Si el usuario responde que sí → continúa a la Fase 6.

---

### Fase 6 — skin-designer y mobile-porter, en serie

**Regla explícita, sin excepciones: NUNCA lances los dos agentes en el mismo mensaje ni en
paralelo.** Ambos escriben en `components/game-player.tsx` y en bloques de `app/globals.css`;
ejecutarlos a la vez provoca conflictos de edición entre ellos. Cada uno debe terminar por
completo antes de que el otro empiece.

1. Lanza el agente `skin-designer` con el prompt `skin-designer <slug>`, de forma **síncrona**
   (espera su resultado antes de seguir — no lo mandes a segundo plano ni lo combines con otra
   llamada en el mismo turno).
2. Cuando termine, resume al usuario lo que hizo (paletas creadas en
   `components/games/<slug>/skins.ts`, si construyó el seam de plataforma por ser la primera vez
   que se usa, y su commit). Corre `npm run build` de nuevo.
   - Si el build falla tras `skin-designer` → detente, reporta el error, **no lances
     `mobile-porter`** hasta que el usuario decida cómo seguir.
3. Solo después de que el paso anterior termine y el build esté en verde, lanza el agente
   `mobile-porter` con el prompt `mobile-porter <slug>`, también de forma síncrona.
4. Cuando termine, resume lo que hizo (ajustes de `.crt`/HUD/controles táctiles, su commit) y
   corre `npm run build` una última vez.
5. Mensaje de cierre:

   ```
   ✅ Juego completo.

   Spec:          <ruta del spec>          (recuerda pasar el estado a "Implementado")
   Rama:          spec-NN-slug
   skin-designer: <slug> → classic / neon / retro
   mobile-porter: <slug> → pantalla de juego adaptada a móvil
   Build:         npm run build ✅

   Falta por hacer (humano): actualizar el **Status:** del spec a "Implementado" y
   hacer el commit final antes de mezclar la rama.
   ```

---

## Resumen del comportamiento esperado

```
/spec-impl-game 09-snake-integration        (estado: Implemented)

  Fase 1  →  Encuentra specs/09-snake-integration.md
  Fase 2  →  Lee el estado → "Implemented" → ❌ se detiene
             Muestra el mensaje de error estándar
             No crea rama, no toca código, no lanza agentes

/spec-impl-game duelo-de-ranas/01-duelo-de-ranas-integration   (estado: Draft)

  Fase 1  →  Encuentra specs/game-jam/duelo-de-ranas/01-duelo-de-ranas-integration.md
  Fase 2  →  Lee el estado → "Draft" → ❌ se detiene

/spec-impl-game NN-nuevo-juego              (estado: Approved)

  Fase 1-4  →  Igual que /spec-impl: rama, resumen, implementación paso a paso
  Fase 5    →  npm run build ✅ → detecta slug → confirma con el usuario
  Fase 6    →  skin-designer <slug>  (espera a que termine)
             → mobile-porter <slug> (solo después, nunca en paralelo)
             → build final ✅ → mensaje de cierre
```

**La creación de rama se controla con el flag `AutoCreateBranch`** en `specs/.spec-config.yml`,
igual que en `/spec-impl`. **El encadenamiento de agentes en la Fase 6 es siempre secuencial**,
sin excepción: `mobile-porter` no empieza hasta que `skin-designer` haya terminado y su commit
esté hecho.
