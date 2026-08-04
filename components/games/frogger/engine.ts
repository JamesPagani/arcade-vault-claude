// Original engine — no template exists for Frogger in references/templates/started-games/.

export type FroggerState = "playing" | "dying" | "gameover";

export interface FroggerSnapshot {
  score: number; // rows advanced, bays filled, time bonus, round bonus
  lives: number; // real count, 3 → 0
  level: number; // round number, starts at 1
  state: FroggerState;
}

const CELL = 40;
const COLS = 13;
const ROWS = 16;
const ROW_HUD = 0;
const ROW_GOALS = 1;
const ROW_RIVER_TOP = 2;
const ROW_RIVER_BOTTOM = 7;
const ROW_MEDIAN = 8;
const ROW_ROAD_TOP = 9;
const ROW_ROAD_BOTTOM = 13;
const ROW_START = 14;
const ROW_BOTTOM_BAR = 15;
const GOAL_COLS = [0, 3, 6, 9, 12];
const START_COL = 6;
const HOP_MS = 120;
const DEATH_MS = 700;
const BASE_ROUND_TIME = 15;
const MIN_ROUND_TIME = 8;
const SPEED_PER_LEVEL = 1.15;
const TURTLE_SURFACE_S = 3;
const TURTLE_SUBMERGED_S = 1.5;
const POINTS_ROW = 10;
const POINTS_BAY = 50;
const POINTS_TIME_PER_SECOND = 10;
const POINTS_ROUND = 200;

type Direction = "up" | "down" | "left" | "right";
type EntityKind = "car" | "truck" | "log" | "turtle";

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

interface Entity {
  col: number; // fractional, in cells
  width: number; // in cells
  kind: EntityKind;
  cyclePhase: number; // turtles only: seconds offset into the submersion cycle
}

interface Lane {
  row: number;
  speed: number; // cells per second, always positive
  dir: 1 | -1;
  entities: Entity[];
  trackLength: number; // cyclic length entities wrap around at, in cells
  elapsed: number; // seconds accumulated on this lane — also drives the turtle cycle
}

interface Frog {
  col: number; // fractional while hopping or drifting on the river
  row: number;
  hopFrom: { col: number; row: number } | null;
  hopT: number; // ms elapsed into the current hop
}

// Per-lane template: how densely entities are packed (period) and their
// nominal width, expressed in cells. `period - width` is the guaranteed gap,
// kept >= 1 cell so the frog always has somewhere to land — see spec risk
// "Buildable lanes are not guaranteed by random generation."
interface LaneTemplate {
  row: number;
  dir: 1 | -1;
  baseSpeed: number;
  kind: EntityKind;
  width: number;
  period: number;
  phase: number;
}

const ROAD_TEMPLATES: LaneTemplate[] = [
  { row: 9, dir: 1, baseSpeed: 2.0, kind: "car", width: 1, period: 4, phase: 0 },
  { row: 10, dir: -1, baseSpeed: 2.6, kind: "truck", width: 3, period: 7, phase: 2 },
  { row: 11, dir: 1, baseSpeed: 1.6, kind: "car", width: 1, period: 4, phase: 1 },
  { row: 12, dir: -1, baseSpeed: 3.0, kind: "truck", width: 2, period: 6, phase: 3 },
  { row: 13, dir: 1, baseSpeed: 2.2, kind: "car", width: 1, period: 4, phase: 2 },
];

const RIVER_TEMPLATES: LaneTemplate[] = [
  { row: 2, dir: 1, baseSpeed: 1.2, kind: "log", width: 3, period: 6, phase: 0 },
  { row: 3, dir: -1, baseSpeed: 1.5, kind: "turtle", width: 2, period: 5, phase: 2 },
  { row: 4, dir: 1, baseSpeed: 1.0, kind: "log", width: 4, period: 7, phase: 1 },
  { row: 5, dir: -1, baseSpeed: 1.8, kind: "turtle", width: 3, period: 6, phase: 4 },
  { row: 6, dir: 1, baseSpeed: 1.3, kind: "log", width: 2, period: 5, phase: 3 },
  { row: 7, dir: -1, baseSpeed: 1.6, kind: "turtle", width: 2, period: 5, phase: 0 },
];

export class FroggerEngine {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  private lanes: Lane[] = [];
  private frog: Frog = { col: START_COL, row: ROW_START, hopFrom: null, hopT: 0 };
  private pendingDirection: Direction | null = null;
  private bays: boolean[] = [false, false, false, false, false];
  private furthestRow = ROW_START;

  private timeLeft = BASE_ROUND_TIME;
  private roundTime = BASE_ROUND_TIME;

  private score = 0;
  private lives = 3;
  private level = 1;
  private state: FroggerState = "playing";
  private deathT = 0;
  private deathKind: "road" | "water" | null = null;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.reset();
  }

  reset() {
    this.lanes = this.buildLanes(1);
    this.frog = { col: START_COL, row: ROW_START, hopFrom: null, hopT: 0 };
    this.pendingDirection = null;
    this.bays = [false, false, false, false, false];
    this.furthestRow = ROW_START;
    this.roundTime = BASE_ROUND_TIME;
    this.timeLeft = this.roundTime;
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.state = "playing";
    this.deathT = 0;
    this.deathKind = null;
  }

  getSnapshot(): FroggerSnapshot {
    return { score: this.score, lives: this.lives, level: this.level, state: this.state };
  }

  private buildLanes(level: number): Lane[] {
    const speedScale = Math.pow(SPEED_PER_LEVEL, level - 1);
    return [...ROAD_TEMPLATES, ...RIVER_TEMPLATES].map((t) => {
      const entities: Entity[] = [];
      const count = Math.ceil(COLS / t.period) + 1;
      for (let i = 0; i < count; i++) {
        entities.push({
          col: t.phase + i * t.period - t.period,
          width: t.width,
          kind: t.kind,
          cyclePhase:
            t.kind === "turtle"
              ? (i * (TURTLE_SURFACE_S + TURTLE_SUBMERGED_S)) / count
              : 0,
        });
      }
      return {
        row: t.row,
        speed: t.baseSpeed * speedScale,
        dir: t.dir,
        entities,
        trackLength: count * t.period,
        elapsed: 0,
      };
    });
  }

  // Submerged turtle groups offer no support. Both the visual state (drawLanes)
  // and the support check (riverSupport, added later) read this off the same
  // lane.elapsed accumulator so they can never disagree — see spec risk on the
  // turtle cycle drifting out of sync with a distinct timer under the dt cap.
  private isSubmerged(lane: Lane, entity: Entity): boolean {
    if (entity.kind !== "turtle") return false;
    const cycle = TURTLE_SURFACE_S + TURTLE_SUBMERGED_S;
    const t = (lane.elapsed + entity.cyclePhase) % cycle;
    return t >= TURTLE_SURFACE_S;
  }

  private updateLanes(dt: number) {
    for (const lane of this.lanes) {
      lane.elapsed += dt;
      for (const entity of lane.entities) {
        entity.col += lane.speed * lane.dir * dt;
        if (lane.dir === 1 && entity.col > COLS) {
          entity.col -= lane.trackLength;
        } else if (lane.dir === -1 && entity.col < -entity.width) {
          entity.col += lane.trackLength;
        }
      }
    }
  }

  handleKeyDown(code: string) {
    const dir = KEY_TO_DIRECTION[code];
    if (!dir) return;
    if (this.state !== "playing") return;
    if (this.frog.hopFrom === null) {
      this.startHop(dir);
    } else {
      // Mid-hop: buffer at most one pending direction, overwriting any earlier one.
      this.pendingDirection = dir;
    }
  }

  handleKeyUp(_code: string) {
    // Frogger has no press-and-hold behavior — one hop per press.
  }

  // Bounds: columns 0..COLS-1, rows 1..ROW_START (row 0 and ROW_BOTTOM_BAR are
  // canvas-only HUD strips, never playable cells).
  private startHop(dir: Direction) {
    let dc = 0;
    let dr = 0;
    if (dir === "up") dr = -1;
    else if (dir === "down") dr = 1;
    else if (dir === "left") dc = -1;
    else dc = 1;

    const targetCol = Math.round(this.frog.col) + dc;
    const targetRow = this.frog.row + dr;
    if (targetCol < 0 || targetCol > COLS - 1) return;
    if (targetRow < ROW_GOALS || targetRow > ROW_START) return;

    this.frog.hopFrom = { col: this.frog.col, row: this.frog.row };
    this.frog.col = targetCol;
    this.frog.row = targetRow;
    this.frog.hopT = 0;
  }

  private finishHop() {
    this.frog.hopFrom = null;
    this.frog.hopT = 0;
    this.resolveCell();
  }

  private resolveCell() {
    this.checkRowProgress();
    if (this.frog.row === ROW_GOALS) {
      this.checkGoalCell();
    } else {
      this.checkRoadCollision();
      if (this.state === "playing") this.checkRiverSupport(0);
    }
  }

  // +10 the first time a round reaches a row closer to the goal than before —
  // tracked via furthestRow so re-crossing the same row scores nothing more.
  private checkRowProgress() {
    if (this.frog.row < this.furthestRow) {
      this.score += POINTS_ROW;
      this.furthestRow = this.frog.row;
    }
  }

  private checkGoalCell() {
    const idx = GOAL_COLS.indexOf(Math.round(this.frog.col));
    if (idx === -1 || this.bays[idx]) {
      this.killFrog("road");
      return;
    }
    this.enterBay(idx);
  }

  private enterBay(idx: number) {
    this.bays[idx] = true;
    this.score += POINTS_BAY + Math.ceil(this.timeLeft) * POINTS_TIME_PER_SECOND;
    if (this.bays.every(Boolean)) {
      this.completeRound();
    } else {
      this.respawn();
    }
  }

  private completeRound() {
    this.score += POINTS_ROUND;
    this.level += 1;
    this.lanes = this.buildLanes(this.level);
    this.bays = [false, false, false, false, false];
    this.furthestRow = ROW_START;
    this.roundTime = Math.max(MIN_ROUND_TIME, BASE_ROUND_TIME - (this.level - 1));
    this.respawn();
  }

  private cellOverlapsEntity(col: number, entity: Entity): boolean {
    return col < entity.col + entity.width && col + 1 > entity.col;
  }

  private checkRoadCollision() {
    const row = this.frog.row;
    if (row < ROW_ROAD_TOP || row > ROW_ROAD_BOTTOM) return;
    const lane = this.lanes.find((l) => l.row === row);
    if (!lane) return;
    const col = Math.round(this.frog.col);
    if (lane.entities.some((e) => this.cellOverlapsEntity(col, e))) {
      this.killFrog("road");
    }
  }

  // Support loss is only evaluated while idle — checking mid-hop would drown
  // a frog in flight between two logs. `dt` is the drift to apply this frame;
  // pass 0 to just test support without moving (used right after landing).
  private checkRiverSupport(dt: number) {
    const row = this.frog.row;
    if (row < ROW_RIVER_TOP || row > ROW_RIVER_BOTTOM) return;
    const lane = this.lanes.find((l) => l.row === row);
    if (!lane) return;
    const col = Math.round(this.frog.col);
    const support = lane.entities.find(
      (e) => !this.isSubmerged(lane, e) && this.cellOverlapsEntity(col, e),
    );
    if (!support) {
      this.killFrog("water");
      return;
    }
    this.frog.col += lane.speed * lane.dir * dt;
    if (this.frog.col < 0 || this.frog.col > COLS - 1) {
      this.killFrog("water");
    }
  }

  private isRiverRow(row: number): boolean {
    return row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOTTOM;
  }

  // Enters the ~700 ms death beat: lanes keep moving, input is ignored
  // (handleKeyDown gates on state === "playing"), and the frog draws as a
  // splat/bubble. The life is only deducted once the beat completes, in update().
  private killFrog(kind: "road" | "water") {
    this.deathKind = kind;
    this.state = "dying";
    this.deathT = 0;
  }

  private respawn() {
    this.frog = { col: START_COL, row: ROW_START, hopFrom: null, hopT: 0 };
    this.pendingDirection = null;
    this.timeLeft = this.roundTime;
  }

  update(dt: number) {
    if (this.state === "gameover") return;
    this.updateLanes(dt);

    if (this.state === "playing") {
      if (this.frog.hopFrom !== null) {
        this.frog.hopT += dt * 1000;
        if (this.frog.hopT >= HOP_MS) {
          this.finishHop();
        }
      }
      if (this.state === "playing" && this.frog.hopFrom === null) {
        this.checkRoadCollision();
      }
      if (this.state === "playing" && this.frog.hopFrom === null) {
        this.checkRiverSupport(dt);
      }
      // Stops draining the instant killFrog flips the state to "dying" —
      // otherwise a timeout could fire a second death on the same mistake.
      if (this.state === "playing") {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.killFrog(this.isRiverRow(this.frog.row) ? "water" : "road");
        }
      }
      if (this.state === "playing" && this.frog.hopFrom === null && this.pendingDirection !== null) {
        const dir = this.pendingDirection;
        this.pendingDirection = null;
        this.startHop(dir);
      }
    } else if (this.state === "dying") {
      this.deathT += dt * 1000;
      if (this.deathT >= DEATH_MS) {
        this.deathT = 0;
        this.lives -= 1;
        if (this.lives <= 0) {
          this.lives = 0;
          this.state = "gameover";
        } else {
          this.state = "playing";
          this.respawn();
        }
      }
    }
  }

  private drawZones() {
    const ctx = this.ctx;
    ctx.fillStyle = "#0a0a18";
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "#123018";
    ctx.fillRect(0, ROW_GOALS * CELL, this.width, CELL);

    ctx.fillStyle = "#0d2b4a";
    ctx.fillRect(0, ROW_RIVER_TOP * CELL, this.width, (ROW_RIVER_BOTTOM - ROW_RIVER_TOP + 1) * CELL);

    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, ROW_MEDIAN * CELL, this.width, CELL);

    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0, ROW_ROAD_TOP * CELL, this.width, (ROW_ROAD_BOTTOM - ROW_ROAD_TOP + 1) * CELL);

    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, ROW_START * CELL, this.width, CELL);
  }

  private drawBays() {
    const ctx = this.ctx;
    for (let col = 0; col < COLS; col++) {
      const isGoal = GOAL_COLS.includes(col);
      if (isGoal) {
        const filled = this.bays[GOAL_COLS.indexOf(col)];
        ctx.fillStyle = filled ? "#39d353" : "#08130a";
        ctx.fillRect(col * CELL + 2, ROW_GOALS * CELL + 2, CELL - 4, CELL - 4);
      } else {
        ctx.fillStyle = "#0b3d16";
        ctx.fillRect(col * CELL, ROW_GOALS * CELL, CELL, CELL);
      }
    }
  }

  private drawLanes() {
    const ctx = this.ctx;
    for (const lane of this.lanes) {
      for (const entity of lane.entities) {
        const x = entity.col * CELL;
        const y = lane.row * CELL;
        if (x + entity.width * CELL < 0 || x > this.width) continue;
        const submerged = this.isSubmerged(lane, entity);
        if (entity.kind === "car") ctx.fillStyle = "#e57373";
        else if (entity.kind === "truck") ctx.fillStyle = "#ffb74d";
        else if (entity.kind === "log") ctx.fillStyle = "#8d5524";
        else ctx.fillStyle = submerged ? "#0d5f3a" : "#39d353";
        if (submerged) {
          ctx.globalAlpha = 0.4;
          ctx.fillRect(x + 4, y + 8, entity.width * CELL - 8, CELL - 16);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillRect(x + 2, y + 4, entity.width * CELL - 4, CELL - 8);
        }
      }
    }
  }

  private drawFrog() {
    const ctx = this.ctx;
    if (this.state === "dying") {
      const x = Math.round(this.frog.col) * CELL;
      const y = this.frog.row * CELL;
      if (this.deathKind === "water") {
        ctx.strokeStyle = "#8ecae6";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + CELL / 2, y + CELL / 2, CELL / 3, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#7a1f1f";
        ctx.fillRect(x + 4, y + CELL / 2 - 4, CELL - 8, 8);
      }
      return;
    }

    let col = this.frog.col;
    let row = this.frog.row;
    if (this.frog.hopFrom !== null) {
      const t = Math.min(this.frog.hopT / HOP_MS, 1);
      col = this.frog.hopFrom.col + (this.frog.col - this.frog.hopFrom.col) * t;
      row = this.frog.hopFrom.row + (this.frog.row - this.frog.hopFrom.row) * t;
    }
    const x = col * CELL;
    const y = row * CELL;
    ctx.fillStyle = "#c6ff00";
    ctx.strokeStyle = "#0a0a18";
    ctx.lineWidth = 2;
    ctx.fillRect(x + 6, y + 6, CELL - 12, CELL - 12);
    ctx.strokeRect(x + 6, y + 6, CELL - 12, CELL - 12);
  }

  private drawHud() {
    const ctx = this.ctx;
    ctx.fillStyle = "#e6e6e6";
    ctx.font = "15px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`PUNTAJE ${this.score}`, 8, ROW_HUD * CELL + 26);
    ctx.textAlign = "right";
    ctx.fillText(`NIVEL ${this.level}`, this.width - 8, ROW_HUD * CELL + 26);
  }

  private drawTimerBar() {
    const ctx = this.ctx;
    const barY = ROW_BOTTOM_BAR * CELL;
    const ratio = Math.max(0, this.timeLeft / this.roundTime);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(8, barY + 8, this.width - 16, 10);
    ctx.fillStyle = ratio > 0.5 ? "#39d353" : ratio > 0.25 ? "#ffd54f" : "#e57373";
    ctx.fillRect(8, barY + 8, (this.width - 16) * ratio, 10);

    ctx.fillStyle = "#e6e6e6";
    ctx.font = "13px monospace";
    ctx.textAlign = "left";
    for (let i = 0; i < this.lives; i++) {
      ctx.fillText("♥", 8 + i * 16, barY + 32);
    }
  }

  private drawOverlay() {
    const ctx = this.ctx;
    ctx.textAlign = "center";
    ctx.fillStyle = "#e57373";
    ctx.font = "bold 32px monospace";
    ctx.fillText("FIN DEL JUEGO", this.width / 2, this.height / 2 - 12);
    ctx.font = "16px monospace";
    ctx.fillStyle = "#e6e6e6";
    ctx.fillText(`PUNTAJE: ${this.score}`, this.width / 2, this.height / 2 + 18);
  }

  draw() {
    this.drawZones();
    this.drawBays();
    this.drawLanes();
    this.drawFrog();
    this.drawHud();
    this.drawTimerBar();
    if (this.state === "gameover") this.drawOverlay();
  }
}
