// Ported from references/templates/started-games/04-arkanoid/{game.js, assets/spritesheet.js}.
// Module-level globals (game, paddle, ball, keys, ssImg, ssLoaded) become instance state on ArkanoidEngine.
//
// Deviation from the template (see spec 08, "Decisions Taken and Discarded"): the template only
// ships 3 block layouts in its `LEVELS` array and has no mouse-driven paddle control — both were
// ported literally rather than invented to match spec prose that described a 5-level, mouse+keyboard
// game. `reset()` is designed from scratch since the template has no restart mechanism.

export type ArkanoidState = "playing" | "gameover" | "win";

export interface ArkanoidSnapshot {
  score: number;
  lives: number;
  level: number; // currentLevel, 1-indexed
  state: ArkanoidState;
}

const ROW_COLORS = ["red", "yellow", "cyan", "magenta", "hotpink", "green"] as const;
const BRICK_ROWS = 6;
const BRICK_COLS = 10;
const BRICK_WIDTH = 76;
const BRICK_HEIGHT = 24;
const BRICK_GAP = 4;
const BRICK_OFFSET_TOP = 60;

const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 14;
const PADDLE_SPEED = 6;

const BALL_RADIUS = 8;
const BALL_SPEED = 5;
const PADDLE_MAX_BOUNCE_ANGLE = (75 * Math.PI) / 180;

const EXPLOSION_DURATION = 150;

const EXPLOSION_FRAMES: Record<string, { sx: number; sy: number; sw: number; sh: number }[]> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 },
    { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 },
    { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 },
    { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 },
    { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 },
    { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 },
    { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 },
    { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 },
    { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 },
    { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 },
    { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
};

const SPRITES: Record<string, { sx: number; sy: number; sw: number; sh: number }> = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
};

const BLOCK_SPRITES: Record<string, { sx: number; sy: number; sw: number; sh: number }> = {
  red: { sx: 32, sy: 176, sw: 32, sh: 16 },
  yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
  cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
  magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
  hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
  green: { sx: 32, sy: 208, sw: 32, sh: 16 },
};

// Ported verbatim from game.js — the template only defines 3 layouts.
const LEVELS: number[][][] = [
  [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ],
  [
    [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
  ],
  [
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
  ],
];

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  alive: boolean;
}

interface Explosion {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  startTime: number;
}

export class ArkanoidEngine {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private brickOffsetLeft: number;
  private paddleY: number;

  private keys: Record<string, boolean> = {};

  private paddle = { x: 0, y: 0, width: PADDLE_WIDTH, height: PADDLE_HEIGHT };
  private ball = { x: 0, y: 0, radius: BALL_RADIUS, dx: 0, dy: 0 };
  private blocks: Brick[] = [];
  private explosions: Explosion[] = [];

  private score = 0;
  private lives = 3;
  private currentLevel = 0;
  private state: ArkanoidState = "playing";

  private ssImg: HTMLCanvasElement | null = null;
  private ssLoaded = false;

  private bounceSound: HTMLAudioElement;
  private breakSound: HTMLAudioElement;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.brickOffsetLeft = (width - (BRICK_COLS * BRICK_WIDTH + (BRICK_COLS - 1) * BRICK_GAP)) / 2;
    this.paddleY = height - 40;

    this.bounceSound = new Audio("/games/arkanoid/sounds/ball-bounce.mp3");
    this.breakSound = new Audio("/games/arkanoid/sounds/break-sound.mp3");

    this.loadSpritesheet();
    this.reset();
  }

  private loadSpritesheet() {
    const rawImg = new Image();
    rawImg.onload = () => {
      const oc = document.createElement("canvas");
      oc.width = rawImg.width;
      oc.height = rawImg.height;
      const octx = oc.getContext("2d");
      octx?.drawImage(rawImg, 0, 0);
      this.ssImg = oc;
      this.ssLoaded = true;
    };
    rawImg.onerror = () => console.error("Failed to load spritesheet");
    rawImg.src = "/games/arkanoid/spritesheet-breakout.png";
  }

  private drawFrame(frame: { sx: number; sy: number; sw: number; sh: number }, x: number, y: number, w: number, h: number) {
    if (!this.ssLoaded || !this.ssImg) return;
    this.ctx.drawImage(this.ssImg, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
  }

  private drawSprite(name: string, x: number, y: number, w: number, h: number) {
    if (!this.ssLoaded || !this.ssImg) return;
    const sp = name.startsWith("block_") ? BLOCK_SPRITES[name.slice(6)] : SPRITES[name];
    if (!sp) return;
    this.ctx.drawImage(this.ssImg, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
  }

  private playSound(sound: HTMLAudioElement) {
    (sound.cloneNode() as HTMLAudioElement).play().catch(() => {});
  }

  private buildBricks(): Brick[] {
    const layout = LEVELS[this.currentLevel];
    const bricks: Brick[] = [];
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        if (!layout[row][col]) continue;
        bricks.push({
          x: this.brickOffsetLeft + col * (BRICK_WIDTH + BRICK_GAP),
          y: BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          color: ROW_COLORS[row],
          alive: true,
        });
      }
    }
    return bricks;
  }

  private centerBallOnPaddle() {
    this.ball.x = this.paddle.x + this.paddle.width / 2;
    this.ball.y = this.paddle.y - this.ball.radius;
    this.ball.dx = 0;
    this.ball.dy = 0;
  }

  private launchBall() {
    const angle = Math.PI / 3; // 60 degrees from horizontal
    this.ball.dx = BALL_SPEED * Math.cos(angle);
    this.ball.dy = -BALL_SPEED * Math.sin(angle);
  }

  reset() {
    this.score = 0;
    this.lives = 3;
    this.currentLevel = 0;
    this.state = "playing";
    this.explosions = [];
    this.paddle.x = (this.width - PADDLE_WIDTH) / 2;
    this.paddle.y = this.paddleY;
    this.blocks = this.buildBricks();
    this.centerBallOnPaddle();
    this.launchBall();
  }

  getSnapshot(): ArkanoidSnapshot {
    return { score: this.score, lives: this.lives, level: this.currentLevel + 1, state: this.state };
  }

  handleKeyDown(code: string) {
    if (code === "ArrowLeft" || code === "ArrowRight") this.keys[code] = true;
  }

  handleKeyUp(code: string) {
    if (code === "ArrowLeft" || code === "ArrowRight") this.keys[code] = false;
  }

  private updatePaddle() {
    if (this.keys["ArrowLeft"]) this.paddle.x -= PADDLE_SPEED;
    if (this.keys["ArrowRight"]) this.paddle.x += PADDLE_SPEED;
    this.paddle.x = Math.max(0, Math.min(this.width - this.paddle.width, this.paddle.x));
  }

  private checkPaddleCollision() {
    if (this.ball.dy <= 0) return;
    const hitsPaddle =
      this.ball.y + this.ball.radius >= this.paddle.y &&
      this.ball.y - this.ball.radius <= this.paddle.y + this.paddle.height &&
      this.ball.x + this.ball.radius >= this.paddle.x &&
      this.ball.x - this.ball.radius <= this.paddle.x + this.paddle.width;
    if (!hitsPaddle) return;

    const paddleCenter = this.paddle.x + this.paddle.width / 2;
    const relativeHit = Math.max(-1, Math.min(1, (this.ball.x - paddleCenter) / (this.paddle.width / 2)));
    const angle = relativeHit * PADDLE_MAX_BOUNCE_ANGLE;

    this.ball.dx = BALL_SPEED * Math.sin(angle);
    this.ball.dy = -BALL_SPEED * Math.cos(angle);
    this.ball.y = this.paddle.y - this.ball.radius;
    this.playSound(this.bounceSound);
  }

  private checkBrickCollisions() {
    for (const brick of this.blocks) {
      if (!brick.alive) continue;

      const hits =
        this.ball.x + this.ball.radius >= brick.x &&
        this.ball.x - this.ball.radius <= brick.x + brick.width &&
        this.ball.y + this.ball.radius >= brick.y &&
        this.ball.y - this.ball.radius <= brick.y + brick.height;
      if (!hits) continue;

      brick.alive = false;
      this.score += 100;
      this.playSound(this.breakSound);

      this.explosions.push({
        x: brick.x,
        y: brick.y,
        width: brick.width,
        height: brick.height,
        color: brick.color,
        startTime: performance.now(),
      });

      const overlapLeft = this.ball.x + this.ball.radius - brick.x;
      const overlapRight = brick.x + brick.width - (this.ball.x - this.ball.radius);
      const overlapTop = this.ball.y + this.ball.radius - brick.y;
      const overlapBottom = brick.y + brick.height - (this.ball.y - this.ball.radius);
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

      if (minOverlap === overlapLeft || minOverlap === overlapRight) {
        this.ball.dx *= -1;
      } else {
        this.ball.dy *= -1;
      }

      if (this.blocks.every((b) => !b.alive)) {
        if (this.currentLevel < LEVELS.length - 1) {
          this.advanceLevel();
        } else {
          this.state = "win";
        }
      }

      break;
    }
  }

  private advanceLevel() {
    this.currentLevel += 1;
    this.blocks = this.buildBricks();
    this.paddle.x = (this.width - this.paddle.width) / 2;
    this.centerBallOnPaddle();
    this.launchBall();
  }

  private loseLife() {
    this.lives -= 1;
    this.paddle.x = (this.width - this.paddle.width) / 2;
    if (this.lives <= 0) {
      this.state = "gameover";
      this.centerBallOnPaddle();
    } else {
      this.centerBallOnPaddle();
      this.launchBall();
    }
  }

  private updateBall() {
    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    if (this.ball.x - this.ball.radius < 0) {
      this.ball.x = this.ball.radius;
      this.ball.dx *= -1;
      this.playSound(this.bounceSound);
    } else if (this.ball.x + this.ball.radius > this.width) {
      this.ball.x = this.width - this.ball.radius;
      this.ball.dx *= -1;
      this.playSound(this.bounceSound);
    }

    if (this.ball.y - this.ball.radius < 0) {
      this.ball.y = this.ball.radius;
      this.ball.dy *= -1;
      this.playSound(this.bounceSound);
    }

    this.checkPaddleCollision();
    this.checkBrickCollisions();

    if (this.ball.y - this.ball.radius > this.height) {
      this.loseLife();
    }
  }

  private updateExplosions() {
    const now = performance.now();
    this.explosions = this.explosions.filter((explosion) => now - explosion.startTime < EXPLOSION_DURATION);
  }

  update(dt: number) {
    void dt; // template steps the ball by fixed per-frame velocity, not by dt
    this.updateExplosions();

    if (this.state === "gameover" || this.state === "win") return;

    this.updatePaddle();
    this.updateBall();
  }

  private drawBricks() {
    for (const brick of this.blocks) {
      if (!brick.alive) continue;
      this.drawSprite(`block_${brick.color}`, brick.x, brick.y, brick.width, brick.height);
    }
  }

  private drawExplosions() {
    const frameDuration = EXPLOSION_DURATION / 4;
    const now = performance.now();
    for (const explosion of this.explosions) {
      const elapsed = now - explosion.startTime;
      const frameIndex = Math.min(3, Math.floor(elapsed / frameDuration));
      this.drawFrame(EXPLOSION_FRAMES[explosion.color][frameIndex], explosion.x, explosion.y, explosion.width, explosion.height);
    }
  }

  private drawHud() {
    const ctx = this.ctx;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px sans-serif";
    ctx.textBaseline = "top";

    ctx.textAlign = "left";
    ctx.fillText(`Score: ${this.score}`, 12, 12);

    ctx.textAlign = "center";
    ctx.fillText(`Nivel: ${this.currentLevel + 1}`, this.width / 2, 12);

    ctx.textAlign = "right";
    ctx.fillText(`Lives: ${this.lives}`, this.width - 12, 12);
  }

  private drawEndScreen() {
    const ctx = this.ctx;
    const title = this.state === "win" ? "¡Completaste el juego!" : "GAME OVER";

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";

    ctx.font = "bold 40px sans-serif";
    ctx.fillText(title, this.width / 2, this.height / 2 - 20);

    ctx.font = "24px sans-serif";
    ctx.fillText(`Puntaje final: ${this.score}`, this.width / 2, this.height / 2 + 30);
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawBricks();
    this.drawExplosions();
    this.drawSprite("paddle", this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
    this.drawSprite("ball", this.ball.x - this.ball.radius, this.ball.y - this.ball.radius, this.ball.radius * 2, this.ball.radius * 2);
    this.drawHud();

    if (this.state === "gameover" || this.state === "win") this.drawEndScreen();
  }
}
