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

    if (this.ag.isRequired(id, this.maxPoints)) {
      return true;
    }

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

  private allocate(id: number, amount: number): AllocatedGraph {
    rework['allocate'].touch(id);
    rework['allocateAmount'].touch(amount);
    if (this.allocation.get(id) === amount) {
      console.warn(`Allocating the same amount (${amount}) to node ${id}`);
      return this;
    }

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
    const arbitraryValid =
        this.arbitraryValid(totalPoints - this.allocatedPoints());
    if (arbitraryValid == null) {
      return false;
    }

    return arbitraryValid.arbitrarilyPlacePoints(
               totalPoints - arbitraryValid.allocatedPoints()) != null;
  }

  private isValid(): boolean {
    const withoutRequiredPoints =
        [...this.allocation.entries() ]
            .filter(([ id, amount ]) => amount > 0)
            .every(([ id, _ ]) => this.hasRequiredSelected(id));
    if (!withoutRequiredPoints)
      return false;

    return this.pointsNeededToUnlock() == null;
  }

  private placeablePoints(): number {
    return this.nodeIds()
        .filter(n => !this.allocation.has(n))
        .map(n => this.graph.get(n).points)
        .reduce((acc, v) => acc + v, 0);
  }

  private arbitraryValid(remainingPoints: number): AllocatedGraph|null {
    if (this.isValid())
      return this;
    if (remainingPoints <= 0)
      return null;

    const required = this.missingRequired();
    const contributing =
        this.nodeIds().find(n => this.isSelectable(n) &&
                                 required.some(r => this.contributesTo(n, r)));
    if (contributing != null) {
      const node = this.graph.get(contributing);
      const points = Math.min(remainingPoints, node.points);

      const arbitraryValid = this.allocate(contributing, points)
                                 .arbitraryValid(remainingPoints - points);
      if (arbitraryValid != null)
        return arbitraryValid;

      // If we can't find a valid solution with points in `contributing`, we
      // don't want to search that tree again. Setting to 0 indicates that this
      // class will not allocate to that node.
      return this.allocate(contributing, 0).arbitraryValid(remainingPoints);
    }

    const needed = this.pointsNeededToUnlock();
    if (needed == null)
      return null;

    if (needed > remainingPoints) return null;

    const placed = this.arbitrarilyPlacePoints(needed);
    return placed && placed.arbitraryValid(remainingPoints - needed);
  }

  private arbitrarilyPlacePoints(points: number): AllocatedGraph|null {
    rework['emplace'].touch(points);
    let ag: AllocatedGraph = this;
    while (points > 0) {
      const incrementable = ag.nodeIds().filter(n => ag.isIncrementable(n));
      if (incrementable.length === 0)
        return null;

      for (const id of incrementable) {
        const node = this.getNode(id);

        const allocated = this.allocation.get(id) || 0;
        const increment = Math.min(points, node.points - allocated);

        if (increment > 0) {
          ag = ag.allocate(id, allocated + increment);
          points -= increment;
        } else {
          break;
        }
      }
    }
    return ag;
  }

  private pointsNeededToUnlock(): number|null {
    const withAllocation =
        [...this.allocation.entries() ].filter(([ _, amount ]) => amount > 0);

    let allocatedPoints = 0;
    while (true) {
      const assignable = withAllocation.filter(
          entry =>
              allocatedPoints >= (this.getNode(entry[0]).requiredPoints || 0));
      if (assignable.length === withAllocation.length)
        return null;

      const nextPoints =
          assignable.map(entry => entry[1]).reduce((acc, v) => acc + v, 0);
      if (nextPoints === allocatedPoints) {
        const locked = withAllocation.map(entry => entry[1])
                           .filter(amount => amount > nextPoints);
        if (locked.length === 0) return null;
        return Math.min(...locked);
      }
      allocatedPoints = nextPoints;
    }
  }

  getNode(id: number): GraphNode {
    const item = this.graph.get(id);
    if (item == null) {
      throw new Error(`Invalid talent id ${id}`);
    }
    return item;
  }

  public isRequired(id: number, maxPoints: number): boolean {
    rework['required'].touch(id);
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

  private isIncrementable(id: number): boolean {
    const allocated = this.allocation.get(id);
    // 0 is a special marker for explicitly testing reachability.
    if (allocated === 0)
      return false;

    const node = this.getNode(id);
    return (allocated || 0) < node.points &&
           this.allocatedPoints() >= (node.requiredPoints || 0) &&
           this.hasRequiredSelected(id);
  }

  private missingRequired(): number[] {
    return [...this.allocation.keys() ]
        .filter(id => this.allocation.get(id)! > 0)
        .filter(id => !this.hasRequiredSelected(id));
  }

  private contributesTo(required: number, later: number): boolean {
    const stack = [ later ];

    while (stack.length > 0) {
      const node = stack.pop()!;
      if (node === required)
        return true;

      stack.push(...(this.graph.get(node).requires.filter(l => l >= required)));
    }
    return false;
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
    rework['reachable'].touch(id);
    if (this.allocatedPoints() >= maxPoints) {
      return (this.allocation.get(id) || 0) > 0;
    }
    const withId = this.allocate(id, 1);
    const valid = withId.arbitraryValid(maxPoints - withId.allocatedPoints());
    return valid != null;
  }
}

// reachable, not selected, not active
// reachable, not selected, active, partial
// reachable, not selected, active, full
// reachable, selected, active, partial
// reachable, selected, active, full
// unreachable, not selected, not active
