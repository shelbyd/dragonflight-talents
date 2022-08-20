import {Memoize} from 'typescript-memoize';

import {Talent, TalentTree} from './data.service';
import {Rework} from './development_support';

type Selected = Map<number, number>;

const rework = (window as any).rework = {
  'required' : new Rework('required'),
  'allocate' : new Rework('allocate'),
  'allocateAmount' : new Rework('allocateAmount'),
  'reachable' : new Rework('reachable'),
  'emplace' : new Rework('emplace'),
};

export class TreeSolver {
  private ag: AllocatedGraph;

  private readonly activeCache = new Cache<number, boolean>();

  constructor(
      private readonly maxPoints: number,
      private readonly graph: Graph,
  ) {
    this.ag = AllocatedGraph.empty(graph);
  }

  public static fromUrl(tree: TalentTree): TreeSolver {
    // TODO(shelbyd): Allow user to configure maxPoints.
    return new TreeSolver(11, Graph.fromTree(tree));
  }

  public static fromGraph(points: number, graph: TalentGraph): TreeSolver {
    return new TreeSolver(points, new Graph(graph));
  }

  public trySelect(id: number) {
    if (!this.isReachable(id)) {
      console.warn('Tried to select unreachable node');
      return;
    }

    this.ag = this.ag.addPoint(id);
    this.activeCache.clearWhere((_, v) => v === false);
  }

  public tryUnselect(id: number) {
    this.ag = this.ag.removePoint(id);
    this.activeCache.clearWhere(() => true);
  }

  public isActive(id: number): boolean {
    return this.activeCache.orInsert(id, () => {
      if (this.ag.hasPoints(id))
        return true;

      if (!this.isReachable(id))
        return false;

      const without = this.ag.without(id);
      if (without.points() < this.ag.points())
        return true;

      if (without.maxPoints() < this.maxPoints)
        return true;

      const minValidPoints = without.minPointsToValid() + without.points();
      if (minValidPoints > this.maxPoints)
        return true;

      return false;
    });
  }

  public isReachable(id: number): boolean {
    if (this.ag.getPoints(id) > 0)
      return true;

    const withPoint = this.ag.addPoint(id);
    const minValidPoints = withPoint.minPointsToValid() + withPoint.points();
    return minValidPoints <= this.maxPoints;
  }

  public allocated(id: number): [ number, number ] {
    const node = this.graph.get(id);
    const points = this.ag.getPoints(id);
    if (this.isActive(id) && points === 0) {
      return [ node.points, node.points ];
    }

    return [ points, node.points ];
  }

  public nodeIds(): number[] { return this.ag.graph.nodeIds; }
}

interface TalentGraph {
  [id: number]: GraphNode;
}

interface GraphNode {
  requires: number[];
  points: number;
  requiredPoints?: number;
}

export class Graph {
  nodeIds: number[];

  constructor(readonly graph: TalentGraph) {
    this.nodeIds = [...Object.keys(this.graph) ].map(n => +n);

    for (const id of this.nodeIds) {
      const node = this.get(id);
      for (const r of node.requires) {
        if (r >= id) {
          throw new Error(
              `Graph cannot have node that requires an id greater than itself ${
                  id} requires ${r}`);
        }
      }
    }
  }

  get(id: number): GraphNode { return this.graph[id]; }

  incoming(id: number): number[] { return [...this.get(id).requires ]; }

  @Memoize()
  prune(pruneId: number): Graph {
    const result: TalentGraph = {};
    const recursePrune = [];
    for (const id of this.nodeIds) {
      if (id === pruneId)
        continue;

      const node = this.graph[id];
      const willPrune =
          node.requires.length === 1 && node.requires[0] === pruneId;
      if (willPrune) {
        recursePrune.push(id);
      }

      result[id] = {
        ...node,
        requires : node.requires.filter(i => i !== pruneId),
      };
    }

    return recursePrune.reduce((g, i) => g.prune(i), new Graph(result));
  }

  has(id: number): boolean { return this.graph[id] != null; }

  @Memoize()
  maxPoints(): number {
    const nodes = [...Object.values(this.graph) ];
    nodes.sort((a, b) => (a.requiredPoints || 0) - (b.requiredPoints || 0));

    return nodes.reduce((placedPoints, node) => {
      if (placedPoints < node.requiredPoints)
        return placedPoints;
      return placedPoints + node.points;
    }, 0);
  }

  static fromTree(tree: TalentTree): Graph {
    const graph: TalentGraph = {};

    const ids = [...Object.keys(tree.talents) ].map(n => +n);
    ids.sort((a, b) => a - b);
    for (const id of ids) {
      const talents = tree.talents[id];
      const talent = talents[0];

      const requires = talent.requires;
      const availableRequires = requires.filter(r => graph[r] != null);
      if (requires.length > 0 && availableRequires.length === 0) {
        continue;
      }

      graph[id] = {
        requires : availableRequires,
        points : talent.spells[0].points,
        requiredPoints : talent.requiredPoints,
      };
    }

    return new Graph(graph);
  }
}

// reachable, not selected, not active
// reachable, not selected, active, partial
// reachable, not selected, active, full
// reachable, selected, active, partial
// reachable, selected, active, full
// unreachable, not selected, not active

class AllocatedGraph {
  static empty(graph: Graph): AllocatedGraph {
    return new AllocatedGraph(graph);
  }

  constructor(readonly graph: Graph, private readonly alloc = new Map()) {}

  addPoint(id: number): AllocatedGraph {
    const already = this.alloc.get(id) || 0;
    const node = this.graph.get(id);
    if (already >= node.points)
      return this;

    const newAlloc = new Map(this.alloc);
    newAlloc.set(id, already + 1);
    return new AllocatedGraph(this.graph, newAlloc);
  }

  removePoint(id: number): AllocatedGraph {
    const already = this.alloc.get(id) || 0;
    const node = this.graph.get(id);
    if (already === 0)
      return this;

    return new AllocatedGraph(this.graph,
                              new Map([...this.alloc, [ id, already - 1 ] ]));
  }

  @Memoize()
  minPointsToReach(id: number): number {
    const pointsHere = this.getPoints(id) > 0 ? 0 : 1;
    return this.minFillIncoming(id) + pointsHere;
  }

  @Memoize()
  private minPointsToFill(id: number): number {
    const onThis = this.graph.get(id).points - this.getPoints(id);
    return this.minFillIncoming(id) + onThis;
  }

  @Memoize()
  private minFillIncoming(id: number): number {
    const node = this.graph.get(id);

    if (this.maxPointsBelow(id) < (node.requiredPoints || 0))
      return Infinity;

    const incoming = this.graph.incoming(id);
    const fromDeps =
        incoming.length > 0
            ? Math.min(...incoming.map(i => this.minPointsToFill(i)))
            : 0;

    const orRequired = Math.max(fromDeps, node.requiredPoints || 0);
    return orRequired;
  }

  @Memoize()
  private maxPointsBelow(id: number): number {
    return this.graph.nodeIds.filter(n => n < id)
        .map(n => this.graph.get(n))
        .reduce((sum, node) => sum + node.points, 0);
  }

  @Memoize()
  points(): number {
    return [...this.alloc.values() ].reduce((acc, v) => acc + v, 0);
  }

  hasPoints(id: number): boolean { return this.getPoints(id) > 0; }

  @Memoize()
  without(id: number): AllocatedGraph {
    const pruned = this.graph.prune(id);
    return new AllocatedGraph(pruned, new Map([...this.alloc ].filter(
                                          entry => pruned.has(entry[0]))));
  }

  @Memoize()
  maxPoints(): number {
    return this.graph.maxPoints();
  }

  @Memoize()
  minPointsToValid(placeAtOrAfter = -Infinity): number {
    const missingRequired = this.graph.nodeIds.find(id => {
      if (this.getPoints(id) === 0)
        return false;

      const incoming = this.graph.incoming(id);
      if (incoming.length === 0)
        return false;

      return incoming.every(inc => this.getPoints(inc) <
                                   this.graph.get(inc).points);
    });

    if (missingRequired != null) {
      const minPointsPer =
          this.graph.incoming(missingRequired)
              .map(i => this.addPoint(i).minPointsToValid() + 1);
      return Math.min(...minPointsPer);
    }

    const points = this.points();
    const notEnoughPoints = this.graph.nodeIds.find(id => {
      if (this.getPoints(id) === 0)
        return false;

      const node = this.graph.get(id);
      return this.pointsBelow(id) < (node.requiredPoints || 0);
    });

    if (notEnoughPoints != null) {
      const options = this.graph.nodeIds.filter(
          n => n < notEnoughPoints && n >= placeAtOrAfter && !this.isFull(n));
      if (options.length === 0)
        return Infinity;
      return Math.min(
          ...options.map(n => this.addPoint(n).minPointsToValid(n) + 1));
    }

    return 0;
  }

  @Memoize()
  private pointsBelow(id: number): number {
    return this.graph.nodeIds.filter(n => n < id)
        .map(n => this.getPoints(n))
        .reduce((sum, v) => sum + v, 0);
  }

  public getPoints(id: number): number { return this.alloc.get(id) || 0; }

  private isFull(id: number): boolean {
    return this.getPoints(id) >= this.graph.get(id).points;
  }
}

class Cache<K, V> {
  private readonly map = new Map<K, V>();

  orInsert(key: K, getValue: () => V): V {
    if (this.map.has(key))
      return this.map.get(key)!;

    const v = getValue();
    this.map.set(key, v);
    return v;
  }

  clearWhere(pred: (key: K, value: V) => boolean) {
    for (const [key, value] of this.map.entries()) {
      if (pred(key, value)) {
        this.map.delete(key);
      }
    }
  }
}
