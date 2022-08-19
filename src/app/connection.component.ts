import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostBinding,
  Injectable,
  Input,
  NgZone,
} from '@angular/core';

type Vec2 = {
  x: number; y : number;
}

@Component({
  selector : 'connection',
  template : ``,
  styleUrls : [ './connection.component.css' ],
  changeDetection : ChangeDetectionStrategy.OnPush,
}) export class ConnectionComponent {
  @Input() from!: ElementRef;
  @Input() to!: ElementRef;

  @HostBinding('style.left')
  get left() {
    return `${this.centerPoint(this.from).x}px`;
  }

  @HostBinding('style.top')
  get top() {
    return `${this.centerPoint(this.from).y}px`;
  }

  @HostBinding('style.width')
  get width() {
    const d = this.delta();
    const l = Math.sqrt(d.x * d.x + d.y * d.y);
    return `${l}px`;
  }

  @HostBinding('style.transform')
  get transform() {
    const delta = this.delta();
    let angle = Math.atan(-delta.y / -delta.x);
    if (delta.x > 0) {
      angle += Math.PI;
    }
    if (delta.x === 0) {
      angle = Math.PI / 2;
    }
    return `rotate(${angle}rad)`;
  }

  constructor(
      private readonly cdRef: ChangeDetectorRef,
      private readonly zone: NgZone,
      private readonly batchCheck: BatchZone,
  ) {}

  ngOnInit() {
    this.zone.runOutsideAngular(() => { this.pollForMovement(); });
  }

  private destroyed = false;
  ngOnDestroy() { this.destroyed = true; }

  async pollForMovement() {
    let lastFrom = this.centerPoint(this.from);
    let lastTo = this.centerPoint(this.to);

    while (!this.destroyed) {
      await new Promise(resolve => setTimeout(resolve, 100));

      const thisFrom = this.centerPoint(this.from);
      const thisTo = this.centerPoint(this.to);

      const same = eq(lastFrom, thisFrom) && eq(lastTo, thisTo);
      if (same)
        continue;

      this.batchCheck.run(() => { this.cdRef.markForCheck(); });

      lastFrom = thisFrom;
      lastTo = thisTo;
    }
  }

  delta() {
    const from = this.centerPoint(this.from);
    const to = this.centerPoint(this.to);

    const dx = from.x - to.x;
    const dy = from.y - to.y;

    return {x : dx, y : dy};
  }

  centerPoint(el: ElementRef): Vec2 {
    const rect = el.nativeElement.getBoundingClientRect();
    return {
      x : rect.x + (rect.width / 2),
      y : rect.y + (rect.height / 2),
    };
  }
}

function eq(l: Vec2, r: Vec2): boolean { return l.x === r.x && l.y === r.y; }

@Injectable({providedIn : 'root'})
class BatchZone {
  private batch: Array<() => void> = [];

  constructor(private readonly zone: NgZone) {}

  run(fn: () => void) {
    if (this.batch.length === 0) {
      setTimeout(() => this.exhaustBatch(), 0);
    }

    this.batch.push(fn);
  }

  private exhaustBatch() {
    this.zone.run(() => {
      for (const fn of this.batch) {
        fn();
      }
      this.batch = [];
    });
  }
}
