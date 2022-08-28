type Ord = boolean|number|OrdRev<Ord>|[Ord]|[Ord, Ord]|[Ord, Ord, Ord];

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

  if (typeof a === 'boolean') {
    return a === b ? 0 : !a ? -1 : 1;
  } else if (typeof a === 'number') {
    return a - b;
  }

  if (Array.isArray(a)) {
    for (let i = 0; i < a.length; i++) {
      const aV = a[i];
      const bV = b[i];
      const cmp = compare(aV, bV);
      if (cmp !== 0)
        return cmp;
    }

    return 0;
  }

  throw new Error(`Unrecognized Ord type: ${typeof a}`);
}

export function ordRev<T>(t: T): OrdRev<T> { return new OrdRev(t); }

export class OrdRev<T> {
  constructor(readonly t: T) {}
}

export function range(n: number): number[] { return [...new Array(n).keys() ]; }

export function maxByKey<T, K extends Ord>(ts: T[], getKey: (t: T) => K): T|
    null {
  if (ts.length === 0)
    return null;

  let max = ts[0];
  let maxKey = getKey(max);

  for (let i = 1; i < ts.length; i++) {
    const t = ts[i];
    const key = getKey(t);
    if (compare(key, maxKey) > 0) {
      max = t;
      maxKey = key;
    }
  }

  return max;
}

export function minByKey<T, K extends Ord>(ts: T[], getKey: (t: T) => K): T|
    null {
  return maxByKey(ts, (t) => ordRev(getKey(t)));
}

export function randomSample<T>(ts: T[]): T|null {
  if (ts.length === 0)
    return null;

  return ts[Math.floor(Math.random() * ts.length)];
}
