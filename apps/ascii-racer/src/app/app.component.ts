import { Component, HostListener, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';

import { BehaviorSubject, Observable, map, switchMap, tap, timer } from 'rxjs';

enum Direction {
  left = 'ArrowLeft',
  up = 'ArrowUp',
  right = 'ArrowRight',
  down = 'ArrowDown',
}

interface SpeedTier {
  minKm: number;
  intervalMs: number;
  label: string;
}

const SPEED_TIERS: SpeedTier[] = [
  { minKm: 0,  intervalMs: 50, label: '🚗 Slow'       },
  { minKm: 2,  intervalMs: 43, label: '🚗 Normal'     },
  { minKm: 5,  intervalMs: 36, label: '🏁 Fast'       },
  { minKm: 10, intervalMs: 28, label: '⚡ Turbo'      },
  { minKm: 15, intervalMs: 20, label: '🚀 Hyperspeed' },
];

const SPEED_TIERS_DESC = [...SPEED_TIERS].reverse();

const NITRO_SPEED_MS = 12;
const NITRO_DURATION_MS = 5000;
const SHIELD_DURATION_MS = 3000;
const MILESTONE_DISPLAY_DURATION_MS = 2500;
const MILESTONE_INTERVAL_KM = 5;

@Component({
  selector: 'ascii-racer-root',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnDestroy {
  readonly data$: Observable<string[][]>;
  readonly trackWitdth = 100;
  readonly trackLength = 50;
  readonly maxCrashes = 5;
  private readonly highScoreKey = 'ascii-racer-highscore';
  private readonly speedMs$ = new BehaviorSubject<number>(SPEED_TIERS[0].intervalMs);

  title = 'ascii-racer';
  racerPosition = 20;
  racerPositionY = 49;

  crashs = 0;
  way = 0;
  isGameOver = false;
  isPaused = false;
  highScore = 0;
  stars = 0;
  speedTier: SpeedTier = SPEED_TIERS[0];
  isNewHighScore = false;

  isNitroActive = false;
  isShielded = false;
  milestoneVisible = false;
  currentMilestone = 0;

  private trackData!: string[][];
  private readonly track = [15, 35];
  private moveIntervalId: ReturnType<typeof setInterval> | null = null;
  private nitroTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private shieldTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private milestoneTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.highScore = parseFloat(localStorage.getItem(this.highScoreKey) || '0');
    this.data$ = this.speedMs$.pipe(
      switchMap(ms => timer(0, ms)),
      map(() => this.updateTrack()),
      tap(() => {
        if (!this.isGameOver && !this.isPaused) {
          this.way = Math.round((this.way + 0.001) * 1000) / 1000;
          this.updateSpeed();
          this.checkMilestone();
        }
      }),
      tap(data => this.check(data)),
    );
  }

  @HostListener('window:keydown', ['$event']) handleKeyboardEvents(e: KeyboardEvent): void {
    if (e.key === ' ') {
      if (!this.isGameOver) {
        this.isPaused = !this.isPaused;
      }
      return;
    }
    if (this.isGameOver || this.isPaused) return;
    const direction = e.key as Direction;
    if (direction === Direction.left || e.key.toLowerCase() === 'a') {
      this.doMove('left');
    }
    if (direction === Direction.right || e.key.toLowerCase() === 'd') {
      this.doMove('right');
    }
  }

  /** Start continuous movement while a touch/pointer button is held. */
  startMoving(dir: 'left' | 'right'): void {
    if (this.isGameOver || this.isPaused) return;
    this.stopMoving();
    this.doMove(dir);
    this.moveIntervalId = setInterval(() => this.doMove(dir), 150);
  }

  /** Stop continuous movement (called on pointerup / pointercancel). */
  stopMoving(): void {
    if (this.moveIntervalId !== null) {
      clearInterval(this.moveIntervalId);
      this.moveIntervalId = null;
    }
  }

  /** Toggle pause – used by both spacebar and the on-screen pause button. */
  togglePause(): void {
    if (!this.isGameOver) {
      this.isPaused = !this.isPaused;
    }
  }

  ngOnDestroy(): void {
    this.stopMoving();
    if (this.nitroTimeoutId !== null) clearTimeout(this.nitroTimeoutId);
    if (this.shieldTimeoutId !== null) clearTimeout(this.shieldTimeoutId);
    if (this.milestoneTimeoutId !== null) clearTimeout(this.milestoneTimeoutId);
  }

  restart(): void {
    this.stopMoving();
    this.crashs = 0;
    this.way = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.racerPosition = 20;
    this.stars = 0;
    this.speedTier = SPEED_TIERS[0];
    this.isNewHighScore = false;
    this.isNitroActive = false;
    this.isShielded = false;
    this.milestoneVisible = false;
    this.currentMilestone = 0;
    if (this.nitroTimeoutId !== null) {
      clearTimeout(this.nitroTimeoutId);
      this.nitroTimeoutId = null;
    }
    if (this.shieldTimeoutId !== null) {
      clearTimeout(this.shieldTimeoutId);
      this.shieldTimeoutId = null;
    }
    if (this.milestoneTimeoutId !== null) {
      clearTimeout(this.milestoneTimeoutId);
      this.milestoneTimeoutId = null;
    }
    this.speedMs$.next(SPEED_TIERS[0].intervalMs);
    this.track[0] = 15;
    this.track[1] = 35;
    this.createTrack();
  }

  trackByFn(_: number, item: string | string[]): string | string[] {
    return item;
  }

  private doMove(dir: 'left' | 'right'): void {
    if (this.isGameOver || this.isPaused) return;
    if (dir === 'left') {
      this.racerPosition -= 1;
    } else {
      this.racerPosition += 1;
    }
  }

  private updateTrack(): string[][] {
    if (this.isGameOver || this.isPaused) {
      return this.trackData || [];
    }
    if (!this.trackData) {
      this.createTrack();
    }
    this.trackData = this.trackData.reverse();
    this.trackData = this.trackData.splice(1, this.trackData.length - 1);
    this.trackData[this.trackLength - 1] = [];
    const random = Math.floor(Math.random() * 3);
    switch (random) {
      case 0:
        this.track[0] += 1;
        this.track[1] += 1;
        break;
      case 1:
        if (this.track[0] > 0) {
          this.track[0] -= 1;
          this.track[1] -= 1;
        }
        break;
      default:
        break;
    }

    // Narrow road progressively: target width shrinks from 20 down to 8 over ~22 km
    const targetWidth = Math.max(8, 20 - Math.floor(this.way * 0.55));
    if (this.track[1] - this.track[0] > targetWidth) {
      if (Math.random() < 0.5) {
        this.track[1]--;
      } else {
        this.track[0]++;
      }
    }
    if (this.track[0] < 0) this.track[0] = 0;
    if (this.track[1] >= this.trackWitdth) this.track[1] = this.trackWitdth - 1;

    const roadWidth = this.track[1] - this.track[0];
    const obstacleChance = Math.min(0.05 + this.way * 0.01, 0.25);
    const hasObstacle = roadWidth > 4 && Math.random() < obstacleChance;
    const obstaclePos = hasObstacle
      ? this.track[0] + 1 + Math.floor(Math.random() * (roadWidth - 2))
      : -1;

    const hasPowerUp = !hasObstacle && roadWidth > 4 && Math.random() < 0.04;
    const powerUpPos = hasPowerUp
      ? this.track[0] + 1 + Math.floor(Math.random() * (roadWidth - 2))
      : -1;

    const hasNitro = !hasObstacle && !hasPowerUp && roadWidth > 4 && Math.random() < 0.025;
    const nitroPos = hasNitro
      ? this.track[0] + 1 + Math.floor(Math.random() * (roadWidth - 2))
      : -1;

    for (let j = 0; j < this.trackWitdth; j++) {
      this.trackData[this.trackLength - 1][j] = j < this.track[0] || j > this.track[1] ? '1' : '8';
      if (j === this.track[0] + 10) {
        this.trackData[this.trackLength - 1][j] = '|';
      }
      if (j === obstaclePos) {
        this.trackData[this.trackLength - 1][j] = 'X';
      }
      if (j === powerUpPos) {
        this.trackData[this.trackLength - 1][j] = '$';
      }
      if (j === nitroPos) {
        this.trackData[this.trackLength - 1][j] = 'N';
      }
    }

    return this.trackData.reverse();
  }

  private createTrack(): void {
    this.trackData = [];
    for (let i = 0; i < this.trackLength; i++) {
      this.trackData[i] = [];
      for (let j = 0; j < this.trackWitdth; j++) {
        this.trackData[i][j] = j < this.track[0] || j > this.track[1] ? '1' : '8';
        if (j === this.track[0] + 10) {
          this.trackData[i][j] = '|';
        }
      }
    }
  }

  private updateSpeed(): void {
    if (this.isNitroActive) return;
    const newTier = SPEED_TIERS_DESC.find(t => this.way >= t.minKm) ?? SPEED_TIERS[0];
    this.speedTier = newTier;
    if (newTier.intervalMs !== this.speedMs$.getValue()) {
      this.speedMs$.next(newTier.intervalMs);
    }
  }

  private check(data: string[][]) {
    if (this.isGameOver || this.isPaused) return;
    const lastLine = data.at(-1);
    if (!lastLine) return;
    const cell = lastLine[this.racerPosition];
    if (cell === '$') {
      if (this.crashs > 0) {
        this.crashs--;
      }
      this.stars++;
      this.activateShield();
      lastLine[this.racerPosition] = '8';
    } else if (cell === 'N') {
      this.activateNitro();
      this.stars++;
      lastLine[this.racerPosition] = '8';
    } else if (cell === '1' || cell === 'X') {
      if (!this.isShielded) {
        this.crashs++;
        console.log('Das war ein Unfall');
        if (this.crashs >= this.maxCrashes) {
          this.isGameOver = true;
          if (this.way > this.highScore) {
            this.isNewHighScore = true;
            this.highScore = Math.round(this.way * 1000) / 1000;
            localStorage.setItem(this.highScoreKey, String(this.highScore));
          }
        }
      }
    }
  }

  private activateNitro(): void {
    this.isNitroActive = true;
    this.speedMs$.next(NITRO_SPEED_MS);
    if (this.nitroTimeoutId !== null) {
      clearTimeout(this.nitroTimeoutId);
    }
    this.nitroTimeoutId = setTimeout(() => {
      this.isNitroActive = false;
      this.nitroTimeoutId = null;
      this.speedMs$.next(this.speedTier.intervalMs);
    }, NITRO_DURATION_MS);
  }

  private activateShield(): void {
    this.isShielded = true;
    if (this.shieldTimeoutId !== null) {
      clearTimeout(this.shieldTimeoutId);
    }
    this.shieldTimeoutId = setTimeout(() => {
      this.isShielded = false;
      this.shieldTimeoutId = null;
    }, SHIELD_DURATION_MS);
  }

  private checkMilestone(): void {
    const nearestMilestone = Math.floor(this.way / MILESTONE_INTERVAL_KM) * MILESTONE_INTERVAL_KM;
    if (nearestMilestone > this.currentMilestone && nearestMilestone > 0) {
      this.currentMilestone = nearestMilestone;
      this.milestoneVisible = true;
      if (this.milestoneTimeoutId !== null) {
        clearTimeout(this.milestoneTimeoutId);
      }
      this.milestoneTimeoutId = setTimeout(() => {
        this.milestoneVisible = false;
        this.milestoneTimeoutId = null;
      }, MILESTONE_DISPLAY_DURATION_MS);
    }
  }
}
