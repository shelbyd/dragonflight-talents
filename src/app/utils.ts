type Ord = number|OrdRev<Ord>|[Ord]|[Ord, Ord]|[Ord, Ord, Ord];

export function sortByKey<T, K extends Ord>(ts: T[],
                                            keyGetter: (t: T) => K): T[] {
  const keyed = ts.map(t => [keyGetter(t), t] as [K, T]);
  keyed.sort((a, b) => compare(a[0], b[0]));
  return keyed.map(entry => entry[1]);
}

export function compare<T extends Ord>(a: T, bTyped: T): number {
  const b: any = bTyped;

  if (a instanceof OrdRev) {
    return -compare(a.t, b.t);
  }

  if (typeof a === 'number') {
    return a - b;
  }

  if (Array.isArray(a)) {
    return range(a.length)
        .map(i => [a[i], b[i]])
        .reduce((cmp, [ a, b ]) => cmp === 0 ? compare(a, b) : cmp, 0);
  }

  throw new Error(`Unrecognized Ord type: ${typeof a}`);
}

export function ordRev<T>(t: T): OrdRev<T> { return new OrdRev(t); }

export class OrdRev<T> {
  constructor(readonly t: T) {}
}

export function range(n: number): number[] {
  return [...new Array(n).keys() ];
}
