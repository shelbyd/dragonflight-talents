import {Memoize} from 'typescript-memoize';

import {Talent, TalentTree} from './data.service';
import {Rework} from './development_support';
import {ordRev, sortByKey} from './utils';

type Selected = Map<number, number>;
type Validity = 'valid'|'invalid'|'incomplete';

const rework = (window as any).rework = {
  'required' : new Rework('required'),
  'allocate' : new Rework('allocate'),
  'allocateAmount' : new Rework('allocateAmount'),
  'reachable' : new Rework('reachable'),
  'emplace' : new Rework('emplace'),
  'validity' : new Rework('validity'),
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
    const adjusted = this.solution.adjust(id, amount);
    const constrained = constrain(adjusted, this.problem);
    if (constrained != null) {
      this.solution = constrained;
    } else {
      console.warn(
          `Adjusting ${id} by ${amount} resulted in unsolvable problem`);
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
    return [ points || 0, this.problem.maxPoints(id) ];
  }

  public nodeIds(): number[] { return this.graph.nodeIds; }

  public isSelected(id: number): boolean {
    return this.solution.isSelected(id);
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
  nodes(): GraphNode[] { return [...Object.values(this.graph) ]; }
  has(id: number): boolean { return this.graph[id] != null; }

  @Memoize()
  outgoing(id: number): number[] {
    return this.nodeIds.filter(n => this.get(n).requires.includes(id));
  }

  @Memoize()
  weight(id: number): number {
    const reachable = new Set();
    const unchecked = [ id ];

    while (unchecked.length > 0) {
      const node = unchecked.pop()!;
      for (const o of this.outgoing(node)) {
        if (reachable.has(o))
          continue;

        reachable.add(o);
        unchecked.push(o);
      }
    }

    return reachable.size;
  }

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

export class Problem {
  constructor(readonly graph: Graph, readonly points: number) {}

  maxPoints(id: number): number { return this.graph.get(id).points; }

  optionsFor(id: number): number[] {
    const result = [];
    for (let i = 0; i <= this.graph.get(id).points; i++) {
      result.push(i);
    }
    return result;
  }

  @Memoize()
  without(id: number): Problem {
    return new Problem(this.graph.prune(id), this.points);
  }

  validity(ps: PartialSolution): Validity {
    if (!this.couldPlaceEnoughPoints()) {
      rework['validity'].touch('not_enough_points');
      return 'invalid';
    }

    const allPointsInProblem = ps.allocated().every(
        ([ id, amount ]) => amount === 0 || this.graph.has(id));
    if (!allPointsInProblem) {
      rework['validity'].touch('points_have_been_removed');
      return 'invalid';
    }

    const overAssigned = this.graph.nodeIds.some(id => {
      const node = this.graph.get(id);
      return (ps.getPoints(id) || 0) > node.points;
    });
    if (overAssigned) {
      rework['validity'].touch('over_assigned');
      return 'invalid';
    }

    if (this.minPointsFulfillingRequired(ps) > this.points) {
      rework['validity'].touch('requires_too_many_points');
      return 'invalid';
    }

    const p = this.partialValidity(ps);
    if (p !== 'valid') {
      rework['validity'].touch('invalid_partial');
      return p;
    }

    const missingPoints = this.points - this.totalPoints(ps);
    if (missingPoints > 0) {
      rework['validity'].touch('missing_placed_points');
      return 'incomplete';
    } else if (missingPoints < 0) {
      rework['validity'].touch('too_many_placed_points');
      return 'invalid';
    }

    rework['validity'].touch('valid');
    return 'valid';
  }

  @Memoize()
  private couldPlaceEnoughPoints(): boolean {
    const nodes = sortByKey(this.graph.nodes(), (n) => n.requiredPoints || 0);

    const placeable = nodes.reduce((placed, node) => {
      const enough = placed >= (node.requiredPoints || 0);
      return placed + (enough ? node.points : 0);
    }, 0);
    return placeable >= this.points;
  }

  private minPointsFulfillingRequired(ps: PartialSolution): number {
    const ids = sortByKey([...this.graph.nodeIds ],
                          (n => this.graph.get(n).requiredPoints || 0));

    let minPoints = 0;
    for (const id of ids) {
      const points = ps.getPoints(id);
      if (points === 0 || points == null)
        continue;

      const node = this.graph.get(id);
      minPoints = Math.max(minPoints, node.requiredPoints || 0) + (points || 0);
    }
    return minPoints;
  }

  private partialValidity(ps: PartialSolution): Validity {
    for (const n of this.graph.nodeIds) {
      const v = this.incomingValidity(n, ps);
      if (v !== 'valid')
        return v;
    }

    return 'valid';
  }

  private incomingValidity(id: number, ps: PartialSolution): Validity {
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

  private totalPoints(ps: PartialSolution): number {
    return this.graph.nodeIds.map(n => ps.getPoints(n) ?? 0).reduce((acc, v) => acc + v, 0);
  }

  searchHint(ps: PartialSolution): number|null {
    const missingInc = this.graph.nodeIds.find(
        n => this.incomingValidity(n, ps) === 'incomplete');
    if (missingInc != null) {
      const missing = this.graph.get(missingInc)
                          .requires.find(n => ps.getPoints(n) === null);
      if (missing != null)
        return missing;
    }

    return this.hintConstrainOrder(ps)[0] ?? null;
  }

  hintConstrainOrder(ps: PartialSolution): number[] {
    const empty = this.graph.nodeIds.filter(n => ps.getPoints(n) === null);
    return sortByKey(empty, (n) => {
      return [
        this.graph.weight(n),
        ordRev(n),
      ];
    });
  }
}

export class PartialSolution {
  private inferred = new Map<number, number>();

  private options = new Map<number, number[]>();

  constructor(private readonly user = new Map<number, number>()) {}

  adjust(id: number, amount: number): PartialSolution {
    if (this.inferred.has(id)) {
      console.warn(`Tried to adjust inferred value ${id} by ${amount}`);
      return this;
    }

    const newValue = (this.user.get(id) || 0) + amount;
    if (newValue <= 0) {
      return new PartialSolution(
          new Map([...this.user ].filter(entry => entry[0] !== id)));
    } else {
      return new PartialSolution(new Map([...this.user, [ id, newValue ] ]));
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
    const result = new PartialSolution(this.user);
    result.inferred = new Map(this.inferred);
    result.options = new Map(this.options);
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

  isSelected(id: number): boolean { return this.user.has(id); }
}

export function constrain(
    ps: PartialSolution,
    problem: Problem,
    ): PartialSolution|null {
  return rework['validity'].reportFn(() => {
    let result = ps;

    while (true) {
      const origResult = result;

      for (const node of problem.hintConstrainOrder(ps)) {
        const opts = result.optionsFor(node, () => problem.optionsFor(node));
        if (opts.length === 1)
          continue;

        console.debug('Constraining', node);

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
  });
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

  const checkNode = problem.searchHint(ps);
  if (checkNode == null)
    return false;

  const opts = ps.optionsFor(checkNode, () => problem.optionsFor(checkNode));
  return opts.some(opt => {
    const clone = ps.clone();
    clone.infer(checkNode, opt);
    return solutionExists(clone, problem);
  });
}
