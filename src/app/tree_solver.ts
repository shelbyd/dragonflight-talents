import {Talent, TalentTree} from './data.service';

type Selected = Map<number, number>;

export class TreeSolver {
  private userSelected: Selected = new Map();
  private alwaysActive: Set<number> = new Set();

  // TODO(shelbyd): Allow user to configure maxPoints.
  constructor(
      private readonly maxPoints: number,
      private readonly graph: TalentGraph,
  ) {
    this.alwaysActive =
        new Set([...Object.keys(this.graph) ].map(n => +n).filter(
            n => isAlwaysActive(n, this.graph, this.maxPoints)));
  }

  public static fromUrl(tree: TalentTree): TreeSolver {
    return new TreeSolver(17, treeToGraph(tree));
  }

  public trySelect(id: number) {
    const node = this.getNode(id);
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
  }

  private getNode(id: number): GraphNode {
    const item = this.graph[id];
    if (item == null) {
      throw new Error(`Invalid talent id ${id}`);
    }
    return item;
  }

  public tryUnselect(id: number) {
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

    const allocation = new Map(this.userSelected);
    this.alwaysActive.forEach(id => {
      allocation.set(id, this.graph[id].points);
    });

    const fastRequired = isRequired(id, this.graph, this.maxPoints, allocation);
    // const implicitlyRequired = this.futurePossibilities().every(p =>
    // p.has(id));
    //
    // if (fastRequired !== implicitlyRequired) {
    //   console.log('id', id);
    //   debugger;
    //   isRequired(id, this.graph, this.maxPoints, allocation);
    // }
    if (fastRequired)
      return true;

    return false;
  }

  private futurePossibilities(): Array<Selected> {
    return fullPossibilities(this.graph, this.maxPoints)
        .filter(p => this.isSubsetOf(p));
  }

  private isSubsetOf(p: Selected): boolean {
    return [...this.userSelected.entries() ].every(
        ([ id, count ]) => (p.get(id) || 0) >= count)
  }

  public isReachable(id: number,
                     remainingPoints = this.remainingPoints()): boolean {
    if (remainingPoints <= 0)
      return false;

    const node = this.getNode(id);
    if (node.requires.length === 0)
      return true;

    return node.requires.some(
        n => this.isFullyReachable(n, remainingPoints - 1));
  }

  public remainingPoints(): number {
    const usedPoints =
        [...Object.entries(this.graph) ]
            .map(([ id, node ]) => this.isActive(+id) ? node.points : 0)
            .reduce((acc, v) => acc + v, 0);
    return this.maxPoints - usedPoints;
  }

  private isFullyReachable(id: number,
                           remainingPoints = this.remainingPoints()): boolean {
    const node = this.getNode(id);
    const pointsToReach = remainingPoints - (node.points - 1);
    return this.isReachable(id, pointsToReach);
  }
}

export interface TalentGraph {
  [id: number]: GraphNode;
}

interface GraphNode {
  requires: number[];
  points: number;
  requiredPoints?: number;
}

function treeToGraph(tree: TalentTree): TalentGraph {
  const result: TalentGraph = {};

  for (const [id, talents] of Object.entries(tree.talents)) {
    const talent = talents[0];
    result[+id] = {
      requires : talent.requires,
      points : 1,
      requiredPoints : talent.requiredPoints,
    };
  }

  return result;
}

function fullPossibilities(graph: TalentGraph, remainingPoints: number,
                           onlyAfter = -Infinity,
                           selected = new Map()): Array<Selected> {
  if (remainingPoints === 0)
    return [ selected ];
  if (remainingPoints < 0)
    return [];

  const selectedPoints = [...selected.values() ].reduce((acc, v) => acc + v, 0);
  const selectOptions =
      selectable(graph, selected)
          .filter(n => n > onlyAfter)
          .filter(n => selectedPoints >= (graph[n].requiredPoints || 0));
  if (selectOptions.length === 0)
    return [];
  const thisSelect = Math.min(...selectOptions);
  const thisNode = graph[thisSelect];

  let result: Selected[] = [];
  for (let points = 0; points <= thisNode.points; points++) {
    const thisSelected = new Map(selected);
    if (points > 0) {
      thisSelected.set(thisSelect, points);
    }

    const newPossibilities = fullPossibilities(graph, remainingPoints - points,
                                               thisSelect, thisSelected)

    result = [...result, ...newPossibilities ];
  }
  return result;
}

function isAlwaysActive(id: number, graph: TalentGraph,
                        maxPoints: number): boolean {
  return !solutionExists(graph, maxPoints, new Map([ [ id, 0 ] ]));
}

function solutionExists(graph: TalentGraph, remainingPoints: number,
                        allocation: Selected): boolean {
  if (remainingPoints <= 0) {
    return [...Object.keys(graph) ]
        .map(n => +n)
        .filter(id => (allocation.get(id) || 0) > 0)
        .every(id => hasRequiredSelected(id, graph, allocation));
  }

  const options = selectable(graph, allocation);
  if (options.length === 0)
    return false;

  return options.some(id => {
    const node = graph[id];
    const points = node.points;
    const newAlloc = new Map(allocation);
    newAlloc.set(id, points);

    return solutionExists(graph, remainingPoints - points, newAlloc);
  });
}

function selectable(graph: TalentGraph, allocation: Selected): Array<number> {
  const selectedPoints =
      [...allocation.values() ].reduce((acc, v) => acc + v, 0);
  return Object.keys(graph)
      .map(n => +n)
      .filter(n => hasRequiredSelected(n, graph, allocation))
      .filter(n => !allocation.has(n))
      .filter(n => selectedPoints >= (graph[n].requiredPoints || 0));
}

function hasRequiredSelected(id: number, graph: TalentGraph,
                             allocation: Selected): boolean {
  const requires = graph[id].requires;
  return requires.length === 0 ||
         requires.some(other => allocation.get(other) === graph[other].points);
}

function isRequired(id: number, graph: TalentGraph, maxPoints: number,
                    allocation: Selected): boolean {
  if (isFull(maxPoints, allocation)) {
    return false;
  }

  const withoutThis = new Map(allocation);
  withoutThis.set(id, 0);
  return !solutionExists(graph, maxPoints - allocatedPoints(allocation),
                         withoutThis);
}

function isFull(maxPoints: number, allocation: Selected): boolean {
  return allocatedPoints(allocation) >= maxPoints;
}

function allocatedPoints(allocation: Selected): number {
  return [...allocation.values() ].reduce((acc, v) => acc + v, 0);
}

// reachable, not selected, not active
// reachable, not selected, active, partial
// reachable, not selected, active, full
// reachable, selected, active, partial
// reachable, selected, active, full
// unreachable, not selected, not active
