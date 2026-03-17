import { Component, HostListener } from '@angular/core';
import { AsyncPipe } from '@angular/common';

import { Observable, map, tap, timer } from 'rxjs';

enum Direction {
  left = 'ArrowLeft',
  up = 'ArrowUp',
  right = 'ArrowRight',
  down = 'ArrowDown',
}

@Component({
  selector: 'ascii-racer-root',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  readonly data$: Observable<string[][]>;
  readonly speed = 50;
  readonly trackWitdth = 100;
  readonly trackLength = 50;
  readonly maxCrashes = 5;
  private readonly highScoreKey = 'ascii-racer-highscore';

  title = 'ascii-racer';
  racerPosition = 20;
  racerPositionY = 49;

  crashs = 0;
  way = 0;
  isGameOver = false;
  isPaused = false;
  highScore = 0;

  private trackData!: string[][];
  private readonly track = [15, 35];

  constructor() {
    this.highScore = parseFloat(localStorage.getItem(this.highScoreKey) || '0');
    this.data$ = timer(0, this.speed).pipe(
      map(() => this.updateTrack()),
      tap(() => {
        if (!this.isGameOver && !this.isPaused) {
          this.way = Math.round((this.way + 0.001) * 1000) / 1000;
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
    if (direction === Direction.left) {
      this.racerPosition -= 1;
    }
    if (direction === Direction.right) {
      this.racerPosition += 1;
    }
  }

  restart(): void {
    this.crashs = 0;
    this.way = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.racerPosition = 20;
    this.track[0] = 15;
    this.track[1] = 35;
    this.createTrack();
  }

  trackByFn(_: number, item: string | string[]): string | string[] {
    return item;
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

    const roadWidth = this.track[1] - this.track[0];
    const obstacleChance = Math.min(0.05 + this.way * 0.01, 0.25);
    const hasObstacle = roadWidth > 4 && Math.random() < obstacleChance;
    const obstaclePos = hasObstacle
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

  private check(data: string[][]) {
    if (this.isGameOver || this.isPaused) return;
    const lastLine = data.at(-1);
    if (lastLine && (lastLine[this.racerPosition] === '1' || lastLine[this.racerPosition] === 'X')) {
      this.crashs++;
      console.log('Das war ein Unfall');
      if (this.crashs >= this.maxCrashes) {
        this.isGameOver = true;
        if (this.way > this.highScore) {
          this.highScore = Math.round(this.way * 1000) / 1000;
          localStorage.setItem(this.highScoreKey, String(this.highScore));
        }
      }
    }
  }
}
