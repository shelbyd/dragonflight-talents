import {TreeSolver} from './tree_solver';

describe('DataService', () => {
  const graph = {
    1 : {requires : [], points : 1},
    2 : {requires : [ 1 ], points : 1},
    3 : {requires : [ 2, 1 ], points : 1},

    4 : {requires : [], points : 1},
    5 : {requires : [ 1, 4 ], points : 1},
  };
  let solver: TreeSolver;

  beforeEach(() => { solver = TreeSolver.fromGraph(2, graph); });

  it('no talent is selected', () => {
    const solver = TreeSolver.fromGraph(1, {
      1 : {requires : [], points : 1},
      2 : {requires : [], points : 1},
    });

    expect(solver.isActive(1)).toBe(false);
  });

  it('after selecting root talent', () => {
    solver.trySelect(1);

    expect(solver.isActive(1)).toBe(true);
  });

  it('fails selecting a missing talent',
     () => { expect(() => solver.trySelect(1234567890)).toThrow(); });

  it('selects required talent when selecting later talent', () => {
    solver.trySelect(2);

    expect(solver.isActive(1)).toBe(true);
  });

  it('does not select when requires 2', () => {
    const graph = {
      1 : {requires : [], points : 1},
      2 : {requires : [], points : 1},
      3 : {requires : [ 2, 1 ], points : 1},
    };
    const solver = TreeSolver.fromGraph(2, graph);

    solver.trySelect(3);

    console.log('Checking 1');
    expect(solver.isActive(1)).toBe(false);
    console.log('Checking 2');
    expect(solver.isActive(2)).toBe(false);
  });

  it('deselects required after deselecting later', () => {
    solver.trySelect(2);
    solver.tryUnselect(2);

    expect(solver.isActive(1)).toBe(false);
  });

  it('selects required when out of points', () => {
    const graph = {
      1 : {requires : [], points : 1},
      2 : {requires : [], points : 1},
      3 : {requires : [], points : 1},

      4 : {requires : [ 1, 2 ], points : 1},
      5 : {requires : [ 2, 3 ], points : 1},
    };

    const solver = TreeSolver.fromGraph(3, graph);

    solver.trySelect(4);
    solver.trySelect(5);

    expect(solver.isActive(2)).toBe(true);
  });

  it('disallows picking unreachable node', () => {
    const graph = {
      1 : {requires : [], points : 1},
      2 : {requires : [ 1 ], points : 1},
      3 : {requires : [ 2 ], points : 1},
    };

    const solver = TreeSolver.fromGraph(2, graph);

    solver.trySelect(3);

    expect(solver.isActive(3)).toBe(false);
  });

  it('uses points for automatically picking', () => {
    const graph = {
      1 : {requires : [], points : 2},
      2 : {requires : [ 1 ], points : 1},
      3 : {requires : [ 1 ], points : 1},
    };

    const solver = TreeSolver.fromGraph(3, graph);

    solver.trySelect(2);

    expect(solver.isActive(1)).toBe(true);

    expect(solver.isActive(3)).toBe(false);
    expect(solver.isReachable(3)).toBe(false);
  });

  it('uses requiredPoints for possibilities', () => {
    const graph = {
      1 : {requires : [], points : 1},
      2 : {requires : [], points : 1},
      3 : {requires : [], points : 1, requiredPoints : 2},
      4 : {requires : [], points : 1, requiredPoints : 2},
    };

    const solver = TreeSolver.fromGraph(3, graph);

    solver.trySelect(1);
    solver.trySelect(3);

    expect(solver.isReachable(4)).toBe(false);
  });

  it('auto activates required node', () => {
    const graph = {
      1 : {requires : [], points : 1},
      2 : {requires : [1], points : 1},
      3 : {requires : [1], points : 1},
    };

    const solver = TreeSolver.fromGraph(2, graph);

    expect(solver.isActive(1)).toBe(true);
  });

  it('requiredPoints is reachable', () => {
    const graph = {
      1 : {requires : [], points : 1},
      2 : {requires : [1], points : 1},
      3 : {requires : [1], points : 1},
      5 : {requires : [2], points : 1, requiredPoints: 3},
    };

    const solver = TreeSolver.fromGraph(4, graph);

    expect(solver.isReachable(5)).toBe(true);
  });

  it('places multiple points for reachability', () => {
    const graph = {
      1 : {requires : [], points : 1},
      2 : {requires : [1], points : 1},
      3 : {requires : [1], points : 2},
      5 : {requires : [2], points : 1, requiredPoints: 4},
    };

    const solver = TreeSolver.fromGraph(5, graph);

    expect(solver.isReachable(5)).toBe(true);
  });
});
