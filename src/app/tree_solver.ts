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

export type Selection = {
  [node: number]: number
};

export class TreeSolver {
  private readonly problem: Problem;
  private solution = new PartialSolution();

  constructor(
      private readonly maxPoints: number,
      private readonly graph: Graph,
      selection: Selection = {},
  ) {
    this.problem = new Problem(this.graph, this.maxPoints);

    for (const entry of Object.entries(selection)) {
      this.solution = this.solution.set(+entry[0], entry[1]);
    }

    const constrained = constrain(this.solution, this.problem);
    if (constrained == null)
      throw new Error('Provided impossible problem');

    this.solution = constrained;
  }

  public static fromTree(tree: TalentTree, maxPoints: number,
                         selection: Selection): TreeSolver {
    return new TreeSolver(maxPoints, Graph.fromTree(tree), selection);
  }

  public static fromGraph(points: number, graph: TalentGraph): TreeSolver {
    return new TreeSolver(points, new Graph(graph));
  }

  public trySelect(id: number) {
    const current = this.solution.getPoints(id) || 0;
    const options = this.problem.optionsFor(id).filter(o => o > current);
    options.sort((a, b) => a - b);
    for (const o of options) {
      if (this.trySet(id, o))
        return;
    }
  }
  public tryUnselect(id: number) {
    const current = this.solution.getPoints(id) || 0;
    const options = this.problem.optionsFor(id).filter(o => o < current);
    options.sort((a, b) => b - a);
    for (const o of options) {
      if (this.trySet(id, o))
        return;
    }
  }

  private trySet(id: number, value: number): boolean {
    const adjusted = this.solution.set(id, value);
    const constrained = constrain(adjusted, this.problem);
    if (constrained != null) {
      this.solution = constrained;
      return true;
    } else {
      console.warn(`Setting ${id} to ${value} resulted in unsolvable problem`);
      return false;
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

  public usedPoints(): number { return this.solution.totalPoints(); }
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
    let anyIncomplete = false;
    for (const n of this.graph.nodeIds) {
      const v = this.incomingValidity(n, ps);
      if (v === 'invalid')
        return v;
      anyIncomplete = anyIncomplete || v === 'incomplete';
    }

    return anyIncomplete ? 'incomplete' : 'valid';
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
                          .requires.find(n => ps.getPoints(n) === null)!;
      return missing;
    }

    return this.hintConstrainOrder(ps)[0] ?? null;
  }

  hintConstrainOrder(ps: PartialSolution): number[] {
    const empty = this.graph.nodeIds.filter(n => ps.getPoints(n) === null);
    return sortByKey(empty, (n) => {
      return [
        ps.optionsFor(n, this).length,
        this.graph.weight(n),
        ordRev(n),
      ];
    });
  }
}

export class PartialSolution {
  private inferred = new Map<number, number>();

  private partiallyDefined = new Map<number, PartiallyDefined>();

  constructor(private readonly user = new Map<number, number>()) {}

  set(id: number, value: number): PartialSolution {
    if (this.inferred.has(id)) {
      console.warn(`Tried to set inferred value ${id} to ${value}`);
      return this;
    }

    if (value <= 0) {
      return new PartialSolution(
          new Map([...this.user ].filter(entry => entry[0] !== id)));
    } else {
      return new PartialSolution(new Map([...this.user, [ id, value ] ]));
    }
  }

  infer(id: number, value: number) {
    if (this.user.has(id))
      throw new Error(`Tried to infer id ${id} with user ${this.user.get(id)}`);

    this.partiallyDefined.delete(id);
    this.inferred.set(id, value);
  }

  clone(): PartialSolution {
    const result = new PartialSolution(this.user);
    result.inferred = new Map(this.inferred);
    result.partiallyDefined = new Map(this.partiallyDefined);
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

  unexploredFor(id: number, problem: Problem): number[] {
    if (this.getPoints(id) != null)
      return [];

    if (!this.partiallyDefined.has(id)) {
      this.partiallyDefined.set(id, {
        valid : [],
        unknown : problem.optionsFor(id),
      });
    }

    return this.partiallyDefined.get(id)!.unknown;
  }

  private ensurePartiallyDefined(id: number, problem: Problem): PartiallyDefined
      |null {
    if (this.getPoints(id) != null)
      return null;

    if (!this.partiallyDefined.has(id)) {
      this.partiallyDefined.set(id, {
        valid : [],
        unknown : problem.optionsFor(id),
      });
    }

    return this.partiallyDefined.get(id)!;
  }

  setValid(id: number, points: number, problem: Problem): PartialSolution|null {
    const pd = this.ensurePartiallyDefined(id, problem);
    if (pd == null)
      return this;

    if (pd.valid.includes(points))
      return this;
    if (!pd.unknown.includes(points))
      return this;

    const newPd = {
      valid : [...pd.valid, points ],
      unknown : pd.unknown.filter(p => p !== points),
    };
    return this.inferFromPartial(id, newPd);
  }

  setInvalid(id: number, points: number, problem: Problem): PartialSolution
      |null {
    const pd = this.ensurePartiallyDefined(id, problem);
    if (pd == null)
      return this;

    if (pd.valid.includes(points)) {
      throw new Error(`Set known valid as invalid ${id} @ ${points}`);
    }
    if (!pd.unknown.includes(points))
      return this;

    const newPd = {
      valid : pd.valid,
      unknown : pd.unknown.filter(p => p !== points),
    };
    return this.inferFromPartial(id, newPd);
  }

  private inferFromPartial(id: number, pd: PartiallyDefined): PartialSolution
      |null {
    if (pd.valid.length === 0 && pd.unknown.length === 0)
      return null;

    const clone = this.clone();
    if (pd.valid.length === 1 && pd.unknown.length === 0) {
      clone.partiallyDefined.delete(id);
      clone.inferred.set(id, pd.valid[0]);
    } else {
      clone.partiallyDefined.set(id, pd);
    }
    return clone;
  }

  optionsFor(id: number, problem: Problem): number[] {
    const points = this.getPoints(id);
    if (points != null)
      return [ points ];

    const pd = this.ensurePartiallyDefined(id, problem);
    if (pd == null)
      return [];

    return [...pd.valid, ...pd.unknown ];
  }

  allocated(): Array<[ number, number ]> {
    return [...this.user.entries(), ...this.inferred.entries() ];
  }

  isSelected(id: number): boolean { return this.user.has(id); }
}

interface PartiallyDefined {
  valid: number[];
  unknown: number[];
}

export function constrain(
    ps: PartialSolution,
    problem: Problem,
    ): PartialSolution|null {
  let result = ps;

  while (true) {
    const origResult = result;

    for (const node of problem.hintConstrainOrder(ps)) {
      const toExplore = result.unexploredFor(node, problem);

      for (const explore of toExplore) {
        const clone = result.clone();
        clone.infer(node, explore);

        const solution = findSolution(clone, problem);
        if (solution == null) {
          const set = result.setInvalid(node, explore, problem);
          if (set == null)
            return null;
          result = set;
        } else {
          for (const node of problem.graph.nodeIds) {
            const p = solution.getPoints(node);
            if (p == null)
              continue;
            const set = result.setValid(node, p, problem);
            if (set == null)
              return null;
            result = set;
          }
        }
      }
    }

    if (result === origResult)
      return result;
  }
}

export function findSolution(ps: PartialSolution,
                             problem: Problem): PartialSolution|null {
  const validity = problem.validity(ps);
  switch (validity) {
  case 'valid':
    return ps;
  case 'invalid':
    return null;
  case 'incomplete':
    break;
  default:
    throw new Error(`Unhandled validity ${validity}`);
  }

  const withoutZeros = problem.graph.nodeIds.filter(n => ps.getPoints(n) === 0)
                           .reduce((p, node) => p.without(node), problem);
  if (withoutZeros != problem) {
    return findSolution(ps, withoutZeros);
  }

  const checkNode = problem.searchHint(ps);
  if (checkNode == null)
    return null;

  const opts = ps.optionsFor(checkNode, problem);
  for (const opt of opts) {
    const clone = ps.clone();
    clone.infer(checkNode, opt);
    const s = findSolution(clone, problem);
    if (s != null)
      return s;
  }

  return null;
}
