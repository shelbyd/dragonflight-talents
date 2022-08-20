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

  constructor(
      private readonly maxPoints: number,
      graph: Graph,
  ) {
    this.ag = AllocatedGraph.empty(graph);
  }

  public static fromUrl(tree: TalentTree): TreeSolver {
    // TODO(shelbyd): Allow user to configure maxPoints.
    return new TreeSolver(30, Graph.fromTree(tree));
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
  }

  public tryUnselect(id: number) { this.ag = this.ag.removePoint(id); }

  public isActive(id: number): boolean {
    if (this.ag.hasPoints(id))
      return true;

    const without = this.ag.without(id);
    if (without.points() < this.ag.points())
      return true;

    if (without.maxPoints() < this.maxPoints)
      return true;

    const minValidPoints = without.minPointsToValid() + without.points();
    if (minValidPoints > this.maxPoints)
      return true;

    return false;
  }

  public isReachable(id: number): boolean {
    return this.ag.minReachablePoints(id) <=
           (this.maxPoints - this.ag.points());
  }
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
    return [...Object.values(this.graph) ]
        .map(n => n.points)
        .reduce((acc, v) => acc + v, 0);
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
        points : 1,
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

  constructor(private readonly graph: Graph,
              private readonly alloc = new Map()) {}

  addPoint(id: number): AllocatedGraph {
    const already = this.alloc.get(id) || 0;
    const node = this.graph.get(id);
    if (already >= node.points)
      return this;

    return new AllocatedGraph(this.graph,
                              new Map([...this.alloc, [ id, already + 1 ] ]));
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
  minReachablePoints(id: number): number {
    if ((this.alloc.get(id) || 0) > 0)
      return 0;

    const node = this.graph.get(id);
    const incoming = this.graph.incoming(id);

    const fromDeps =
        incoming.length > 0
            ? Math.min(...incoming.map(i => this.minFillablePoints(i)))
            : 0;
    const orRequired = Math.max(fromDeps, node.requiredPoints || 0);
    return orRequired + 1;
  }

  @Memoize()
  points(): number {
    return [...this.alloc.values() ].reduce((acc, v) => acc + v, 0);
  }

  hasPoints(id: number): boolean { return this.getPoints(id) > 0; }

  @Memoize()
  without(id: number): AllocatedGraph {
    return new AllocatedGraph(
        this.graph.prune(id),
        new Map([...this.alloc ].filter(entry => entry[0] !== id)));
  }

  @Memoize()
  maxPoints(): number {
    return this.graph.maxPoints();
  }

  @Memoize()
  minPointsToValid(): number {
    const missingRequired = this.graph.nodeIds.find(id => {
      const incoming = this.graph.incoming(id);
      if (incoming.length === 0)
        return false;

      const hasFullRequired = incoming.some(inc => this.getPoints(inc) >=
                                                   this.graph.get(inc).points);
      if (hasFullRequired)
        return false;
      return true;
    });
    if (missingRequired == null) return 0;

    const minPointsPer = this.graph.incoming(missingRequired)
                             .map(i => this.addPoint(i).minPointsToValid() + 1);
    return Math.min(...minPointsPer);
  }

  @Memoize()
  private minFillablePoints(id: number): number {
    const node = this.graph.get(id);
    if ((this.alloc.get(id) || 0) >= node.points)
      return 0;

    const incoming = this.graph.incoming(id);

    const fromDeps =
        incoming.length > 0
            ? Math.min(...incoming.map(i => this.minFillablePoints(i)))
            : 0;
    const orRequired = Math.max(fromDeps, node.requiredPoints || 0);
    return orRequired + node.points;
  }

  private getPoints(id: number): number { return this.alloc.get(id) || 0; }

  private incomingPlaceable(): number[] {
    return this.graph.nodeIds.flatMap(id => {
      const incoming = this.graph.incoming(id);
      if (incoming.length === 0)
        return [];

      const hasFullRequired = incoming.some(inc => this.getPoints(inc) >=
                                                   this.graph.get(inc).points);
      if (hasFullRequired)
        return [];

      return incoming;
    })
  }
}
