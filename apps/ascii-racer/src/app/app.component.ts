import { Component, HostListener } from '@angular/core';
import { last, round } from 'lodash';
import { Observable, timer } from 'rxjs';
import { map, tap } from 'rxjs/operators';

// eslint-disable-next-line no-shadow
enum Direction {
  left = 'ArrowLeft',
  up = 'ArrowUp',
  right = 'ArrowRight',
  down = 'ArrowDown',
}

@Component({
  selector: 'ascii-racer-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  readonly data$: Observable<string[][]>;
  readonly speed = 50;
  readonly trackWitdth = 100;
  readonly trackLength = 50;

  title = 'ascii-racer';
  racerPosition = 20;
  racerPositionY = 49;

  crashs = 0;
  way = 0;

  private last: string[][];
  private readonly track = [15, 35];

  constructor() {
    this.data$ = timer(0, this.speed).pipe(
      map(() => this.updateTrack()),
      tap(() => this.way = round(this.way + 0.001, 3)),
      tap(data => this.check(data)),
    );
  }

  @HostListener('window:keydown', ['$event']) handleKeyboardEvents(e: KeyboardEvent): void {
    const direction = e.key as Direction;
    if (direction === Direction.left) {
      this.racerPosition -= 1;
    }
    if (direction === Direction.right) {
      this.racerPosition += 1;
    }
  }

  trackByFn(_: number, item: any): any {
    return item;
  }

  private updateTrack(): string[][] {
    if (!this.last) {
      this.createTrack();
    }
    this.last = this.last.reverse();
    this.last = this.last.splice(1, this.last.length - 1);
    this.last[this.trackLength - 1] = [];
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
    for (let j = 0; j < this.trackWitdth; j++) {
      this.last[this.trackLength - 1][j] = j < this.track[0] || j > this.track[1] ? '1' : '8';
      if (j === this.track[0] + 10) {
        this.last[this.trackLength - 1][j] = '|';
      }
    }

    return this.last.reverse();
  }

  private createTrack(): void {
    this.last = [];
    for (let i = 0; i < this.trackLength; i++) {
      this.last[i] = [];
      for (let j = 0; j < this.trackWitdth; j++) {
        this.last[i][j] = j < this.track[0] || j > this.track[1] ? '1' : '8';
        if (j === this.track[0] + 10) {
          this.last[i][j] = '|';
        }
      }
    }
  }

  private check(data: string[][]) {
    const lastLine = last(data);
    if (lastLine && lastLine[this.racerPosition] === '1') {
      this.crashs++;
      console.log('Das war ein Unfall');
    }
  }
}
