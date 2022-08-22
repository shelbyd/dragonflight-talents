import {Memoize} from 'typescript-memoize';

import {Talent, TalentTree} from './data.service';
import {Rework} from './development_support';

type Selected = Map<number, number>;
type Validity = 'valid'|'invalid'|'incomplete';

const rework = (window as any).rework = {
  'required' : new Rework('required'),
  'allocate' : new Rework('allocate'),
  'allocateAmount' : new Rework('allocateAmount'),
  'reachable' : new Rework('reachable'),
  'emplace' : new Rework('emplace'),
};

export class TreeSolver {
  private readonly problem: Problem;
  private solution = new PartialSolution();

  constructor(
      private readonly maxPoints: number,
      private readonly graph: Graph,
  ) {
    this.problem = new Problem(this.graph, this.maxPoints);
    const constrained = constrain(this.solution, this.problem);
    if (constrained == null)
      throw new Error('Provided impossible problem');
    this.solution = constrained;
  }

  public static fromUrl(tree: TalentTree): TreeSolver {
    // TODO(shelbyd): Allow user to configure maxPoints.
    return new TreeSolver(30, Graph.fromTree(tree));
  }

  public static fromGraph(points: number, graph: TalentGraph): TreeSolver {
    return new TreeSolver(points, new Graph(graph));
  }

  public trySelect(id: number) { this.tryAdjust(id, 1); }
  public tryUnselect(id: number) { this.tryAdjust(id, -1); }

  private tryAdjust(id: number, amount: number) {
    const adjusted = this.solution.clone();
    adjusted.adjust(id, amount);
    const constrained = constrain(adjusted, this.problem);
    if (constrained != null) {
      this.solution = constrained;
    }
  }

  public isActive(id: number): boolean {
    const points = this.solution.getPoints(id)
    return points == null ? false : points > 0;
  }

  public isReachable(id: number): boolean {
    const points = this.solution.getPoints(id);
    return points == null ? true : points > 0;
  }

  public allocated(id: number): [ number, number ] {
    const points = this.solution.getPoints(id);
    return [points || 0, this.problem.maxPoints(id)];
  }

  public nodeIds(): number[] { return this.graph.nodeIds; }
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
  nodes(): GraphNode[] { return [...Object.values(this.graph) ]; }

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

export class Problem {
  constructor(readonly graph: Graph, readonly points: number) {}

  maxPoints(id: number): number {
    return this.graph.get(id).points;
  }

  optionsFor(id: number): number[] {
    const result = [];
    for (let i = 0; i <= this.graph.get(id).points; i++) {
      result.push(i);
    }
    return result;
  }

  without(id: number): Problem {
    return new Problem(this.graph.prune(id), this.points);
  }

  validity(solution: PartialSolution): Validity {
    if (!this.hasEnoughPoints())
      return 'invalid';

    const allPointsInProblem = solution.allocated().every(
        ([ id, amount ]) => amount === 0 || this.graph.has(id));
    if (!allPointsInProblem)
      return 'invalid';

    return this.fullValidity(solution);
  }

  private hasEnoughPoints(): boolean {
    const nodes = this.graph.nodes();
    nodes.sort((a, b) => (a.requiredPoints || 0) - (b.requiredPoints || 0));

    const placeable = nodes.reduce((placed, node) => {
      if (placed >= (node.requiredPoints || 0)) {
        return placed + node.points;
      } else {
        return placed;
      }
    }, 0);
    return placeable >= this.points;
  }

  private partialValidity(ps: PartialSolution): Validity {
    for (const n of this.graph.nodeIds) {
      const v = this.nodeValidity(n, ps);
      if (v !== 'valid')
        return v;
    }

    return 'valid';
  }

  private nodeValidity(id: number, ps: PartialSolution): Validity {
    const node = this.graph.get(id);
    if (node.requires.length === 0)
      return 'valid';

    const nodePoints = ps.getPoints(id) || 0;
    if (nodePoints === 0)
      return 'valid';

    let anyIncomplete = false;
    for (const r of node.requires) {
      const p = ps.getPoints(r);
      if (p === this.graph.get(r).points)
        return 'valid';
      anyIncomplete = anyIncomplete || p === null;
    }

    return anyIncomplete ? 'incomplete' : 'invalid';
  }

  private fullValidity(ps: PartialSolution): Validity {
    const p = this.partialValidity(ps);
    if (p !== 'valid')
      return p;

    const missingPoints = this.points - this.totalPoints(ps);
    if (missingPoints === 0) {
      return 'valid';
    } else if (missingPoints > 0) {
      return 'incomplete';
    } else {
      return 'invalid';
    }
  }

  private totalPoints(ps: PartialSolution): number {
    return this.graph.nodeIds.map(n => ps.getPoints(n) ?? 0).reduce((acc, v) => acc + v, 0);
  }
}

export class PartialSolution {
  private user = new Map<number, number>();
  private inferred = new Map<number, number>();

  private options = new Map<number, number[]>();

  adjust(id: number, amount: number) {
    if (this.inferred.has(id)) {
      console.warn(`Tried to adjust inferred value ${id} by ${amount}`);
      return;
    }

    this.options.delete(id);
    this.inferred.clear();

    const newValue = (this.user.get(id) || 0) + amount;
    if (newValue <= 0) {
      this.user.delete(id);
    } else {
      this.user.set(id, newValue);
    }
  }

  infer(id: number, value: number) {
    this.options.delete(id);

    if (this.user.has(id))
      throw new Error(`Tried to infer id ${id} with user ${this.user.get(id)}`);

    this.inferred.set(id, value);
  }

  setOptions(id: number, opts: number[]) {
    if (opts.length === 0) {
      throw new Error(`Tried to assign no options to ${id}`);
    } else if (opts.length === 1) {
      this.infer(id, opts[0]);
    } else {
      this.options.set(id, opts);
    }
  }

  imutSetOptions(id: number, opts: number[]) {
    const existing = this.options.get(id);
    if (JSON.stringify(existing) === JSON.stringify(opts))
      return this;

    const clone = this.clone();
    clone.setOptions(id, opts);
    return clone;
  }

  clone(): PartialSolution {
    const result = new PartialSolution();
    result.user = new Map(this.user);
    result.inferred = new Map(this.inferred);
    result.options = new Map([...this.options.entries() ].map(
        ([ key, value ]) => [key, [...value ]]));
    return result;
  }

  totalPoints(): number {
    const sumValues = (map: Map<unknown, number>) => [...map.values()].reduce(
        (acc, v) => acc + v, 0);
    return sumValues(this.user) + sumValues(this.inferred);
  }
  getPoints(id: number): number|null {
    return this.user.get(id) ?? this.inferred.get(id) ?? null;
  }

  optionsFor(id: number, get: () => number[]): number[] {
    const points = this.getPoints(id);
    if (points != null)
      return [ points ];

    if (!this.options.has(id)) {
      this.options.set(id, get());
    }
    return this.options.get(id)!;
  }

  allocated(): Array<[ number, number ]> {
    return [...this.user.entries(), ...this.inferred.entries() ];
  }
}

export function constrain(
    ps: PartialSolution,
    problem: Problem,
    ): PartialSolution|null {
  let result = ps;

  while (true) {
    const origResult = result;

    for (const node of problem.graph.nodeIds) {
      const opts = result.optionsFor(node, () => problem.optionsFor(node));
      if (opts.length === 1)
        continue;

      const valid = opts.filter(opt => {
        const clone = result.clone();
        clone.infer(node, opt);
        return solutionExists(clone, problem);
      });

      if (valid.length === 0) {
        return null;
      } else {
        result = result.imutSetOptions(node, valid);
      }
    }

    if (result === origResult)
      return result;
  }
}

export function solutionExists(ps: PartialSolution, problem: Problem): boolean {
  const validity = problem.validity(ps);
  switch (validity) {
  case 'valid':
    return true;
  case 'invalid':
    return false;
  case 'incomplete':
    break;
  default:
    throw new Error(`Unhandled validity ${validity}`);
  }

  const withoutZeros = problem.graph.nodeIds.filter(n => ps.getPoints(n) === 0)
                           .reduce((p, node) => p.without(node), problem);
  if (withoutZeros != problem) {
    return solutionExists(ps, withoutZeros);
  }

  const empty = problem.graph.nodeIds.find(n => ps.getPoints(n) == null);
  if (empty == null) {
    return false;
  }

  const opts = ps.optionsFor(empty, () => problem.optionsFor(empty));
  return opts.some(opt => {
    const clone = ps.clone();
    clone.infer(empty, opt);
    return solutionExists(clone, problem);
  });
}
