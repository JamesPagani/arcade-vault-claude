// Original engine — no template exists for Snake in references/templates/started-games/.
// Fruit crops ported from references/templates/source-assets/snake-assets/sprites.js
// (window.SPRITE_ATLAS.fruits) into the FRUIT_ATLAS constant below.

import { DEFAULT_SKIN, type SkinId } from "@/components/games/skins";
import { SNAKE_PALETTES, type SnakePalette } from "@/components/games/snake/skins";

export type SnakeState = "playing" | "dead" | "gameover";

export interface SnakeSnapshot {
  score: number;
  lives: number; // sentinel, always 1 — no real lives in classic Snake
  level: number; // speed tier, +1 every time the tick interval is scaled down
  state: SnakeState;
}

interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Ported from sprites.js: fruits row of fruits.png (3790x442px, transparent bg).
const FRUIT_ATLAS: Record<string, SpriteRect> = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  garlic: { x: 540, y: 136, w: 130, h: 160 },
  eggplant: { x: 712, y: 136, w: 130, h: 160 },
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  carrot: { x: 1228, y: 136, w: 130, h: 160 },
  mushroom: { x: 1400, y: 136, w: 130, h: 160 },
  broccoli: { x: 1582, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  pepper: { x: 1906, y: 136, w: 150, h: 160 },
  kiwi: { x: 2068, y: 136, w: 170, h: 160 },
  lemon: { x: 2250, y: 136, w: 140, h: 160 },
  peach: { x: 2432, y: 136, w: 130, h: 160 },
  peanut: { x: 2604, y: 136, w: 130, h: 160 },
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  tomato: { x: 2948, y: 136, w: 130, h: 160 },
  berries: { x: 3110, y: 136, w: 150, h: 160 },
  grapes2: { x: 3302, y: 136, w: 110, h: 160 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160 },
  melon: { x: 3637, y: 136, w: 130, h: 160 },
};

const FRUIT_KEYS = Object.keys(FRUIT_ATLAS);

const CELL = 20;
const BASE_POINTS = 10;
const BASE_TICK_INTERVAL = 0.14; // seconds per grid step
const TICK_SCALE = 0.95;
const MIN_TICK_INTERVAL = 0.045;
const FRUIT_PER_SPEEDUP = 5;

interface Cell {
  x: number;
  y: number;
}

interface Food {
  x: number;
  y: number;
  fruitKey: string;
}

type Direction = "up" | "down" | "left" | "right";

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

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

export class SnakeEngine {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private cols: number;
  private rows: number;

  private snake: Cell[] = [];
  private direction: Direction = "right";
  private pendingDirection: Direction = "right";
  private food!: Food;

  private tickInterval = BASE_TICK_INTERVAL;
  private tickAccumulator = 0;
  private fruitEaten = 0;

  private score = 0;
  private level = 1;
  private state: SnakeState = "playing";

  private fruitImage: HTMLImageElement;
  private imageLoaded = false;
  private palette: SnakePalette;

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    skin: SkinId = DEFAULT_SKIN,
  ) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.cols = Math.floor(width / CELL);
    this.rows = Math.floor(height / CELL);
    this.palette = SNAKE_PALETTES[skin];

    this.fruitImage = new Image();
    this.fruitImage.onload = () => {
      this.imageLoaded = true;
    };
    this.fruitImage.src = "/games/snake/fruits.png";

    this.reset();
  }

  reset() {
    const startX = Math.floor(this.cols / 2);
    const startY = Math.floor(this.rows / 2);
    this.snake = [
      { x: startX - 2, y: startY },
      { x: startX - 1, y: startY },
      { x: startX, y: startY },
    ];
    this.direction = "right";
    this.pendingDirection = "right";
    this.tickInterval = BASE_TICK_INTERVAL;
    this.tickAccumulator = 0;
    this.fruitEaten = 0;
    this.score = 0;
    this.level = 1;
    this.state = "playing";
    this.spawnFood();
  }

  getSnapshot(): SnakeSnapshot {
    return { score: this.score, lives: 1, level: this.level, state: this.state };
  }

  setSkin(id: SkinId) {
    this.palette = SNAKE_PALETTES[id];
  }

  private spawnFood() {
    let x: number, y: number;
    do {
      x = Math.floor(Math.random() * this.cols);
      y = Math.floor(Math.random() * this.rows);
    } while (this.snake.some((seg) => seg.x === x && seg.y === y));

    const fruitKey = FRUIT_KEYS[Math.floor(Math.random() * FRUIT_KEYS.length)];
    this.food = { x, y, fruitKey };
  }

  handleKeyDown(code: string) {
    const dir = KEY_TO_DIRECTION[code];
    if (!dir) return;
    if (dir === OPPOSITE[this.direction]) return;
    this.pendingDirection = dir;
  }

  handleKeyUp(_code: string) {
    // Snake has no press-and-hold behavior beyond direction, nothing to release.
  }

  private step() {
    this.direction = this.pendingDirection;
    const head = this.snake[this.snake.length - 1];
    let nx = head.x;
    let ny = head.y;
    if (this.direction === "up") ny--;
    else if (this.direction === "down") ny++;
    else if (this.direction === "left") nx--;
    else nx++;

    if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) {
      this.state = "gameover";
      return;
    }

    const willGrow = nx === this.food.x && ny === this.food.y;
    // The tail cell vacates this same tick unless the snake is growing, so it's not an obstacle.
    const body = willGrow ? this.snake : this.snake.slice(1);
    if (body.some((seg) => seg.x === nx && seg.y === ny)) {
      this.state = "gameover";
      return;
    }

    this.snake.push({ x: nx, y: ny });

    if (willGrow) {
      this.score += BASE_POINTS;
      this.fruitEaten++;
      if (this.fruitEaten % FRUIT_PER_SPEEDUP === 0) {
        this.tickInterval = Math.max(MIN_TICK_INTERVAL, this.tickInterval * TICK_SCALE);
        this.level++;
      }
      this.spawnFood();
    } else {
      this.snake.shift();
    }
  }

  update(dt: number) {
    if (this.state !== "playing") return;
    const cappedDt = Math.min(dt, 0.05);
    this.tickAccumulator += cappedDt;
    while (this.tickAccumulator >= this.tickInterval) {
      this.step();
      this.tickAccumulator -= this.tickInterval;
      if (this.state !== "playing") {
        this.tickAccumulator = 0;
        break;
      }
    }
  }

  private drawFood() {
    const ctx = this.ctx;
    const cx = this.food.x * CELL;
    const cy = this.food.y * CELL;
    if (!this.imageLoaded) return;
    const rect = FRUIT_ATLAS[this.food.fruitKey];
    ctx.drawImage(this.fruitImage, rect.x, rect.y, rect.w, rect.h, cx, cy, CELL, CELL);
  }

  private drawSnake() {
    const ctx = this.ctx;
    const palette = this.palette;
    ctx.shadowBlur = palette.glowBlur;
    for (let i = 0; i < this.snake.length; i++) {
      const seg = this.snake[i];
      const isHead = i === this.snake.length - 1;
      const color = isHead ? palette.head : palette.body;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    }
    ctx.shadowBlur = 0;
  }

  private drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = this.palette.gridLine;
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, this.height);
      ctx.stroke();
    }
    for (let y = 0; y <= this.rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(this.width, y * CELL);
      ctx.stroke();
    }
  }

  private drawWalls() {
    const ctx = this.ctx;
    ctx.strokeStyle = this.palette.wall;
    ctx.shadowColor = this.palette.wall;
    ctx.shadowBlur = this.palette.glowBlur;
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, this.width - 3, this.height - 3);
    ctx.shadowBlur = 0;
  }

  private drawHUD() {
    const ctx = this.ctx;
    ctx.fillStyle = this.palette.hudText;
    ctx.shadowColor = this.palette.hudText;
    ctx.shadowBlur = this.palette.glowBlur;
    ctx.font = "15px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE  ${this.score}`, 14, 26);
    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${this.level}`, this.width / 2, 26);
    ctx.shadowBlur = 0;
  }

  private drawOverlay(title: string, sub: string) {
    const ctx = this.ctx;
    ctx.textAlign = "center";
    ctx.fillStyle = this.palette.overlayTitle;
    ctx.shadowColor = this.palette.overlayTitle;
    ctx.shadowBlur = this.palette.glowBlur;
    ctx.font = "bold 46px monospace";
    ctx.fillText(title, this.width / 2, this.height / 2 - 18);
    ctx.font = "18px monospace";
    ctx.fillStyle = this.palette.overlaySub;
    ctx.fillText(sub, this.width / 2, this.height / 2 + 22);
    ctx.shadowBlur = 0;
  }

  draw() {
    const ctx = this.ctx;
    ctx.shadowBlur = 0;
    ctx.fillStyle = this.palette.background;
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawGrid();
    this.drawWalls();
    this.drawFood();
    this.drawSnake();
    this.drawHUD();

    if (this.state === "gameover")
      this.drawOverlay("GAME OVER", `PUNTAJE: ${this.score}   —   ESPACIO PARA REINICIAR`);
  }
}
