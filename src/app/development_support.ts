export class Rework<T> {
  private counts = new Map();

  constructor(readonly name: string) {}

  public touch(value: T) {
    this.counts.set(value, (this.counts.get(value) || 0) + 1);
  }

  public clear() {
    this.counts = new Map();
  }

  public report() {
    const entries = [...this.counts.entries()];
    entries.sort((a, b) => a[1] - b[1]);
    for (const entry of entries) {
      console.log(this.name, entry[0], entry[1]);
    }
  }
}
