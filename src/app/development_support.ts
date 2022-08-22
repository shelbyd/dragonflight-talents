export class Rework<T> {
  private counts = new Map();
  private timeToReport = Infinity;

  constructor(readonly name: string, private reportEvery = Infinity) {
    this.timeToReport = this.reportEvery;
  }

  public touch(value: T) {
    this.counts.set(value, (this.counts.get(value) || 0) + 1);

    this.timeToReport -= 1;
    if (this.timeToReport === 0) {
      this.report();
      this.timeToReport = this.reportEvery;
    }
  }

  public clear() {
    this.counts = new Map();
  }

  public report() {
    console.log('----- REWORK REPORT -----')
    const entries = [...this.counts.entries() ];
    entries.sort((a, b) => a[1] - b[1]);
    for (const entry of entries) {
      console.log(this.name, entry[0], entry[1]);
    }
    console.log('----- END REWORK REPORT -----')
  }

  public reportFn<R>(fn: () => R): R {
    this.clear();

    const start = window.performance.now();
    const result = fn();
    const end = window.performance.now();

    this.report();
    console.log(`Took ${end - start}ms`);

    return result;
  }
}
