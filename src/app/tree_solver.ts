import {Talent, TalentTree} from './data.service';

type Selected = Map<number, number>;

export class TreeSolver {
  private userSelected: Selected = new Map();

  private possibilities: Array<Selected>;

  // TODO(shelbyd): Allow user to configure maxPoints.
  constructor(
      private readonly maxPoints: number,
      private readonly graph: TalentGraph,
  ) {
    this.possibilities = fullPossibilities(graph, maxPoints);
    console.log('maxPoints, this.possibilities.length', maxPoints,
                this.possibilities.length);
  }

  public static fromUrl(tree: TalentTree): TreeSolver {
    return new TreeSolver(17, treeToGraph(tree));
  }

  public trySelect(id: number): boolean {
    this.getNode(id);
    if (!this.isSelectable(id))
      return false;

    const already = this.userSelected.get(id) || 0;
    this.userSelected.set(id, already + 1);
    return true;
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

  public isSelected(id: number): boolean {
    if (this.userSelected.has(id))
      return true;

    const compatible = this.possibilities.filter(p => this.isSubsetOf(p));
    const implicitlyRequired = compatible.every(p => p.has(id));
    if (implicitlyRequired)
      return true;

    return false;
  }

  public isSelectable(id: number): boolean {
    return this.futurePossibilities().some(p => p.has(id));
  }

  private futurePossibilities(): Array<Selected> {
    return this.possibilities.filter(p => this.isSubsetOf(p));
  }

  private isSubsetOf(p: Selected): boolean {
    return [...this.userSelected.entries() ].every(
        ([ id, count ]) => (p.get(id) || 0) >= count)
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

  const anyRequiredSelected = (n: number) => {
    const requires = graph[n].requires;
    return requires.length === 0 ||
           requires.some(other => selected.get(other) === graph[other].points);
  };
  const selectedPoints = [...selected.values() ].reduce((acc, v) => acc + v, 0);
  const selectOptions =
      Object.keys(graph)
          .map(n => +n)
          .filter(n => n > onlyAfter)
          .filter(anyRequiredSelected)
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

// reachable, not selected, not active
// reachable, not selected, active, partial
// reachable, not selected, active, full
// reachable, selected, active, partial
// reachable, selected, active, full
// unreachable, not selected, not active
