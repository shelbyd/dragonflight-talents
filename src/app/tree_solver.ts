import {Talent, TalentTree} from './data.service';

type Selected = Map<number, number>;

// TODO(shelbyd): Create objects for TalentGraph and Allocation.

export class TreeSolver {
  private userSelected: Selected = new Map();
  private alwaysActive: Set<number> = new Set();

  // TODO(shelbyd): Allow user to configure maxPoints.
  constructor(
      private readonly maxPoints: number,
      private ag: AllocatedGraph,
  ) {
    this.alwaysActive =
        new Set(ag.nodeIds().filter(n => ag.isAlwaysActive(n, this.maxPoints)));
  }

  public static fromUrl(tree: TalentTree): TreeSolver {
    return new TreeSolver(17, AllocatedGraph.fromTree(tree));
  }

  public static fromGraph(points: number, graph: TalentGraph): TreeSolver {
    return new TreeSolver(points, new AllocatedGraph(graph, new Map()));
  }

  public trySelect(id: number) {
    const node = this.ag.getNode(id);
    if (!this.isReachable(id)) {
      console.warn('Tried to select unreachable node');
      return;
    }

    const already = this.userSelected.get(id) || 0;
    if (already === node.points) {
      console.warn('Tried to select an already full node');
      return;
    }
    this.userSelected.set(id, already + 1);
    this.ag = this.ag.updateAllocation(id, (already) => {
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

    const already = this.userSelected.get(id);
    if (already === 1) {
      this.userSelected.delete(id);
    } else if (already == null) {
      return;
    } else if (already > 1) {
      this.userSelected.set(id, already - 1);
    }
  }

  public isActive(id: number): boolean {
    if (this.userSelected.has(id))
      return true;

    if (this.alwaysActive.has(id)) {
      return true;
    }

    const ag = [...this.alwaysActive ].reduce(
        (ag, active) => ag.allocate(active, ag.getNode(active).points),
        this.ag);
    if (ag.isRequired(id, this.maxPoints))
      return true;

    return false;
  }

  public isReachable(id: number,
                     remainingPoints = this.remainingPoints()): boolean {
    if (remainingPoints <= 0)
      return false;

    const node = this.ag.getNode(id);
    if (node.requires.length === 0)
      return true;

    return node.requires.some(
        n => this.isFullyReachable(n, remainingPoints - 1));
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

    return new AllocatedGraph(graph, new Map());
  }

  constructor(readonly graph: TalentGraph,
              readonly allocation: Map<number, number>) {}

  public nodeIds(): number[] {
    return [...Object.keys(this.graph) ].map(n => +n);
  }

  public isAlwaysActive(id: number, maxPoints: number): boolean {
    return !this.allocate(id, 0).solutionExists(maxPoints);
  }

  public allocate(id: number, amount: number): AllocatedGraph {
    return new AllocatedGraph(this.graph, new Map([
                                ...this.allocation,
                                [ id, amount ],
                              ]));
  }

  public updateAllocation(id: number,
                          fn: (already: number) => number): AllocatedGraph {
    const already = this.allocation.get(id) || 0;
    return this.allocate(id, fn(already));
  }

  public solutionExists(remainingPoints: number): boolean {
    if (remainingPoints <= 0) {
      return this.nodeIds()
          .filter(id => (this.allocation.get(id) || 0) > 0)
          .every(id => this.hasRequiredSelected(id));
    }

    const options = this.selectable();
    if (options.length === 0)
      return false;

    return options.some(id => {
      const points = this.graph[id].points;
      return this.allocate(id, points).solutionExists(remainingPoints - points);
    });
  }

  getNode(id: number): GraphNode {
    const item = this.graph[id];
    if (item == null) {
      throw new Error(`Invalid talent id ${id}`);
    }
    return item;
  }

  public isRequired(id: number, maxPoints: number): boolean {
    if (this.isFull(maxPoints)) {
      return false;
    }

    return !this.allocate(id, 0).solutionExists(maxPoints -
                                                this.allocatedPoints());
  }

  private selectable(): Array<number> {
    const selectedPoints =
        [...this.allocation.values() ].reduce((acc, v) => acc + v, 0);
    return this.nodeIds()
        .filter(n => this.hasRequiredSelected(n))
        .filter(n => !this.allocation.has(n))
        .filter(n => selectedPoints >= (this.graph[n].requiredPoints || 0));
  }

  private hasRequiredSelected(id: number): boolean {
    const requires = this.graph[id].requires;
    return requires.length === 0 ||
           requires.some(other => this.allocation.get(other) ===
                                  this.graph[other].points);
  }

  private isFull(maxPoints: number): boolean {
    return this.allocatedPoints() >= maxPoints;
  }

  public allocatedPoints(): number {
    return [...this.allocation.values() ].reduce((acc, v) => acc + v, 0);
  }
}

// reachable, not selected, not active
// reachable, not selected, active, partial
// reachable, not selected, active, full
// reachable, selected, active, partial
// reachable, selected, active, full
// unreachable, not selected, not active
