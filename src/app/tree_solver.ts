import {Memoize} from 'typescript-memoize';

import {Talent, TalentTree} from './data.service';

type Selected = Map<number, number>;

export class TreeSolver {
  constructor(
      private readonly maxPoints: number,
      private ag: AllocatedGraph,
  ) {
    for (const id of ag.nodeIds()) {
      if (this.ag.isRequired(id, this.maxPoints)) {
        this.ag = ag.updateAllocation(id, (_, node) => node.points);
      }
    }
  }

  public static fromUrl(tree: TalentTree): TreeSolver {
    // TODO(shelbyd): Allow user to configure maxPoints.
    return new TreeSolver(30, AllocatedGraph.fromTree(tree));
  }

  public static fromGraph(points: number, graph: TalentGraph): TreeSolver {
    return new TreeSolver(points,
                          new AllocatedGraph(new Graph(graph), new Map()));
  }

  public trySelect(id: number) {
    if (!this.isReachable(id)) {
      console.warn('Tried to select unreachable node');
      return;
    }

    this.ag = this.ag.updateAllocation(id, (already, node) => {
      if (already >= node.points) {
        return node.points;
      } else {
        return already + 1;
      }
    });
  }

  public tryUnselect(id: number) {
    this.ag = this.ag.updateAllocation(id, (already) => {
      if (already <= 0) {
        return 0;
      } else {
        return already - 1;
      }
    });
  }

  public isActive(id: number): boolean {
    if (this.ag.has(id))
      return true;

    if (this.ag.isRequired(id, this.maxPoints))
      return true;

    return false;
  }

  public isReachable(
      id: number,
      remainingPoints = this.remainingPoints(),
      ): boolean {
    return this.ag.isReachable(id, this.maxPoints);
  }

  public remainingPoints(): number {
    const usedPoints =
        this.ag.nodeIds()
            .map((id) => this.isActive(+id) ? this.ag.getNode(id).points : 0)
            .reduce((acc, v) => acc + v, 0);
    return this.maxPoints - usedPoints;
  }

  private isFullyReachable(id: number,
                           remainingPoints = this.remainingPoints()): boolean {
    const node = this.ag.getNode(id);
    const pointsToReach = remainingPoints - (node.points - 1);
    return this.isReachable(id, pointsToReach);
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

class Graph {
  nodeIds: number[];

  constructor(readonly graph: TalentGraph) {
    this.nodeIds = [...Object.keys(this.graph) ].map(n => +n);
  }

  get(id: number): GraphNode { return this.graph[id]; }
}

class AllocatedGraph {
  static fromTree(tree: TalentTree): AllocatedGraph {
    const graph: TalentGraph = {};

    for (const [id, talents] of Object.entries(tree.talents)) {
      const talent = talents[0];
      graph[+id] = {
        requires : talent.requires,
        points : 1,
        requiredPoints : talent.requiredPoints,
      };
    }

    return new AllocatedGraph(new Graph(graph), new Map());
  }

  constructor(readonly graph: Graph, readonly allocation: Map<number, number>) {
  }

  public nodeIds(): number[] { return this.graph.nodeIds; }

  public allocate(id: number, amount: number): AllocatedGraph {
    const newAlloc = new Map(this.allocation);
    newAlloc.set(id, amount);
    return new AllocatedGraph(this.graph, newAlloc);
  }

  public updateAllocation(id: number,
                          fn: (already: number, node: GraphNode) => number):
      AllocatedGraph {
    const already = this.allocation.get(id) || 0;
    const next = fn(already, this.getNode(id));

    const allocation =
        next === 0
            ? new Map([...this.allocation ].filter(([ v, _ ]) => v !== id))
            : new Map([...this.allocation, [ id, next ] ]);

    return new AllocatedGraph(this.graph, allocation);
  }

  public canHavePoints(totalPoints: number): boolean {
    const firstValid = this.firstValid(totalPoints - this.allocatedPoints());
    if (firstValid == null) {
      return false;
    }

    return firstValid.arbitrarilyPlacePoints(totalPoints - firstValid.allocatedPoints()) != null;
  }

  private isValid(): boolean {
    const withoutRequiredPoints =
        [...this.allocation.entries() ]
            .filter(([ id, amount ]) => amount > 0)
            .every(([ id, _ ]) => this.hasRequiredSelected(id));
    if (!withoutRequiredPoints)
      return false;

    let allocatedPoints = 0;

    let unchecked = [...this.allocation.entries() ];
    let notYetValid: Array<[ number, number ]> = [];
    while (unchecked.length > 0) {
      const entry = unchecked.shift()!;
      if (entry[1] === 0)
        continue;

      const node = this.getNode(entry[0]);
      const isAssignable = allocatedPoints >= (node.requiredPoints || 0);
      if (isAssignable) {
        allocatedPoints += entry[1];
        unchecked = [...unchecked, ...notYetValid ];
        notYetValid = [];
      } else {
        notYetValid.push(entry);
      }
    }
    return notYetValid.length === 0;
  }

  private placeablePoints(): number {
    return this.nodeIds()
        .filter(n => !this.allocation.has(n))
        .map(n => this.graph.get(n).points)
        .reduce((acc, v) => acc + v, 0);
  }

  private firstValid(remainingPoints: number): AllocatedGraph|null {
    if (this.isValid())
      return this;
    if (remainingPoints <= 0)
      return null;

    const required = this.missingRequired();
    for (const n of this.nodeIds()) {
      if (!this.isSelectable(n))
        continue;
      if (!required.some(r => this.contributesTo(n, r)))
        continue;

      const node = this.graph.get(n);
      const ag = this.allocate(n, node.points);
      const firstValid = ag.firstValid(remainingPoints - node.points);
      if (firstValid != null)
        return firstValid;
    }

    return null;
  }

  private arbitrarilyPlacePoints(points: number): AllocatedGraph|null {
    let ag: AllocatedGraph = this;
    while (points > 0) {
      const selectable = ag.nodeIds().filter(n => ag.isSelectable(n));
      if (selectable.length === 0) return null;

      for (const id of selectable) {
        const node = this.getNode(id);
        const thisPoints = Math.min(points, node.points);
        if (thisPoints > 0) {
          ag = ag.allocate(id, thisPoints);
          points -= thisPoints;
        }
      }
    }
    return ag;
  }

  private withAllocated<T>(id: number, amount: number,
                           cb: (ag: AllocatedGraph) => T): T {
    const already = this.allocation.get(id);
    this.allocation.set(id, amount);
    const result = cb(this);
    if (already != null) {
      this.allocation.set(id, already);
    } else {
      this.allocation.delete(id);
    }
    return result;
  }

  getNode(id: number): GraphNode {
    const item = this.graph.get(id);
    if (item == null) {
      throw new Error(`Invalid talent id ${id}`);
    }
    return item;
  }

  public isRequired(id: number, maxPoints: number): boolean {
    if (this.allocatedPoints() >= maxPoints) {
      return false;
    }

    return !this.allocate(id, 0).canHavePoints(maxPoints);
  }

  private isSelectable(id: number): boolean {
    return !this.allocation.has(id) &&
           this.allocatedPoints() >= (this.graph.get(id).requiredPoints || 0) &&
           this.hasRequiredSelected(id);
  }

  private missingRequired(): number[] {
    return [...this.allocation.keys() ]
        .filter(id => this.allocation.get(id)! > 0)
        .filter(id => !this.hasRequiredSelected(id));
  }

  private contributesTo(required: number, later: number): boolean {
    const requires = this.graph.get(later).requires;
    return requires.includes(required) ||
           requires.some(id => this.contributesTo(required, id));
  }

  private hasRequiredSelected(id: number): boolean {
    const requires = this.graph.get(id).requires;
    return requires.length === 0 ||
           requires.some(other => this.allocation.get(other) ===
                                  this.graph.get(other).points);
  }

  public allocatedPoints(): number {
    let sum = 0;
    for (const v of this.allocation.values()) {
      sum += v;
    }
    return sum;
  }

  public has(id: number): boolean { return (this.allocation.get(id) || 0) > 0; }

  public isReachable(id: number, maxPoints: number): boolean {
    if (this.allocatedPoints() >= maxPoints) {
      return (this.allocation.get(id) || 0) > 0;
    }
    const withId = this.allocate(id, 1);
    const valid = withId.firstValid(maxPoints - withId.allocatedPoints());
    return valid != null;
  }
}

// reachable, not selected, not active
// reachable, not selected, active, partial
// reachable, not selected, active, full
// reachable, selected, active, partial
// reachable, selected, active, full
// unreachable, not selected, not active
