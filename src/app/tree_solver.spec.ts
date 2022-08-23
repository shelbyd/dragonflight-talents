import {
  constrain,
  Graph,
  PartialSolution,
  Problem,
  TreeSolver
} from './tree_solver';

describe('tree_solver', () => {
  describe('TreeSolver', () => {
    const graph = {
      1 : {requires : [], points : 1},
      2 : {requires : [ 1 ], points : 1},
      3 : {requires : [ 2, 1 ], points : 1},

      4 : {requires : [], points : 1},
      5 : {requires : [ 1, 4 ], points : 1},
    };

    let solver: TreeSolver;

    beforeEach(() => { solver = TreeSolver.fromGraph(2, graph); });

    afterEach(() => checkProperties(solver));

    function checkProperties(solver: TreeSolver) {
      for (const node of solver.nodeIds()) {
        const reachable = solver.isReachable(node);

        if (solver.isActive(node)) {
          expect(reachable).toBe(true, `Active node is not reachable ${node}`);
        }

        if (reachable) {
          solver.trySelect(node);
          expect(solver.isActive(node))
              .toBe(true, `Unable to select reachable node ${node}`);
          solver.tryUnselect(node);
        }
      }
    }

    it('no talent is selected', () => {
      solver = TreeSolver.fromGraph(1, {
        1 : {requires : [], points : 1},
        2 : {requires : [], points : 1},
      });

      expect(solver.isActive(1)).toBe(false);
    });

    it('after selecting root talent', () => {
      solver.trySelect(1);

      expect(solver.isActive(1)).toBe(true);
    });

    it('selecting single point multiple times', () => {
      solver = TreeSolver.fromGraph(2, {
        1 : {requires : [], points : 1},
        2 : {requires : [], points : 1},
        3 : {requires : [], points : 1},
      });

      solver.trySelect(1);
      solver.trySelect(1);

      expect(solver.allocated(1)).toEqual([1, 1]);
    });

    it('selects required talent when selecting later talent', () => {
      const graph = {
        1 : {requires : [], points : 1},
        2 : {requires : [ 1 ], points : 1},
      };
      solver = TreeSolver.fromGraph(2, graph);

      solver.trySelect(2);

      expect(solver.isActive(1)).toBe(true);
    });

    it('does not select when requires 2', () => {
      const graph = {
        1 : {requires : [], points : 1},
        2 : {requires : [], points : 1},
        3 : {requires : [ 2, 1 ], points : 1},
      };
      solver = TreeSolver.fromGraph(2, graph);

      solver.trySelect(3);

      expect(solver.isActive(1)).toBe(false);
      expect(solver.isActive(2)).toBe(false);
    });

    it('deselects required after deselecting later', () => {
      const graph = {
        1 : {requires : [], points : 1},
        2 : {requires : [ 1 ], points : 1},
        3 : {requires : [], points : 1},
        4 : {requires : [ 3 ], points : 1},
      };
      solver = TreeSolver.fromGraph(2, graph);

      solver.trySelect(2);
      expect(solver.isActive(1)).toBe(true);

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

      solver = TreeSolver.fromGraph(3, graph);

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

      solver = TreeSolver.fromGraph(2, graph);

      solver.trySelect(3);

      expect(solver.isActive(3)).toBe(false);
    });

    it('uses points for automatically picking', () => {
      const graph = {
        1 : {requires : [], points : 2},
        2 : {requires : [ 1 ], points : 1},
        3 : {requires : [ 1 ], points : 1},
      };

      solver = TreeSolver.fromGraph(3, graph);

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

      solver = TreeSolver.fromGraph(3, graph);

      expect(solver.isReachable(1)).toEqual(true);

      solver.trySelect(1);
      solver.trySelect(3);

      expect(solver.isReachable(4)).toBe(false);
    });

    it('auto activates required node', () => {
      const graph = {
        1 : {requires : [], points : 1},
        2 : {requires : [ 1 ], points : 1},
        3 : {requires : [ 1 ], points : 1},
      };

      solver = TreeSolver.fromGraph(2, graph);

      expect(solver.isActive(1)).toBe(true);
    });

    it('requiredPoints is reachable', () => {
      const graph = {
        1 : {requires : [], points : 1},
        2 : {requires : [ 1 ], points : 1},
        3 : {requires : [ 1 ], points : 1},
        4 : {requires : [ 2 ], points : 1, requiredPoints : 3},
      };

      solver = TreeSolver.fromGraph(4, graph);

      expect(solver.isReachable(4)).toBe(true);
    });

    it('places multiple points for reachability', () => {
      const graph = {
        1 : {requires : [], points : 1},
        2 : {requires : [ 1 ], points : 1},
        3 : {requires : [ 1 ], points : 2},
        5 : {requires : [ 2 ], points : 1, requiredPoints : 4},
      };

      solver = TreeSolver.fromGraph(5, graph);

      expect(solver.isReachable(5)).toBe(true);
    });

    it('reproducing mistweaver', () => {
      const graph = {
        1 : {requires : [], points : 1, requiredPoints : 0},
        2 : {requires : [], points : 1, requiredPoints : 0},
        3 : {requires : [], points : 1, requiredPoints : 0},
        4 : {requires : [], points : 1, requiredPoints : 0},
        5 : {requires : [], points : 1, requiredPoints : 2},
        6 : {requires : [ 5 ], points : 1},
      };

      solver = TreeSolver.fromGraph(4, graph);

      expect(solver.isReachable(6)).toBe(true);
    });

    it('activates nodes required to hit requiredPoints', () => {
      const graph = {
        1 : {requires : [], points : 1, requiredPoints : 0},
        2 : {requires : [], points : 1, requiredPoints : 0},
        3 : {requires : [], points : 1, requiredPoints : 2},
        4 : {requires : [], points : 1, requiredPoints : 2},
      };

      solver = TreeSolver.fromGraph(3, graph);

      expect(solver.isActive(1)).toBe(true);
      expect(solver.isActive(2)).toBe(true);

      solver.trySelect(3);
      expect(solver.isReachable(4)).toBe(false);
    });

    it('activates nodes in chain', () => {
      const graph = {
        1 : {requires : [], points : 1},
        2 : {requires : [ 1 ], points : 1},
        3 : {requires : [ 2 ], points : 1},
        4 : {requires : [ 1 ], points : 1},
        5 : {requires : [ 4 ], points : 1},
      };

      solver = TreeSolver.fromGraph(3, graph);
      debugger;
      solver.trySelect(3);

      expect(solver.isActive(2)).toBe(true);

      expect(solver.isReachable(4)).toBe(false);
      expect(solver.isReachable(5)).toBe(false);
    });

    it('requiredPoints blocks reachability', () => {
      const graph = {
        1 : {requires : [], points : 1},
        2 : {requires : [ 1 ], points : 1, requiredPoints : 1},
        3 : {requires : [ 2 ], points : 1},
      };

      solver = TreeSolver.fromGraph(2, graph);
      solver.trySelect(2);

      expect(solver.isReachable(3)).toBe(false);
    });

    it('impossible problem', () => {
      const graph = {
        1 : {requires : [], points : 1},
        2 : {requires : [ 1 ], points : 1, requiredPoints : 2},
        3 : {requires : [ 2 ], points : 1},
      };

      expect(() => { TreeSolver.fromGraph(4, graph); }).toThrow();
    });

    it('only reachable in one direction', () => {
      const graph = {
        1 : {requires : [], points : 1},
        2 : {requires : [ 1 ], points : 1},
        3 : {requires : [ 1 ], points : 2},
        4 : {requires : [ 2, 3 ], points : 1},
      };

      solver = TreeSolver.fromGraph(3, graph);

      solver.trySelect(4);

      expect(solver.isReachable(3)).toBe(false);
    });

    it('too many points after required with options', () => {
      const graph = {
        1 : {requires : [], points : 1},
        2 : {requires : [], points : 1},
        3 : {requires : [], points : 1},
        10 : {requires : [], points : 1, requiredPoints : 2},
        11 : {requires : [], points : 1, requiredPoints : 2},
      };

      solver = TreeSolver.fromGraph(3, graph);

      solver.trySelect(10);

      expect(solver.isReachable(11)).toBe(false);
    });

    it('can only do 0 or 2', () => {
      solver = TreeSolver.fromGraph(4, {
        1 : {requires : [], points : 1},
        2 : {requires : [1], points : 2},
        3 : {requires : [1], points : 2},
        4 : {requires : [2, 3], points : 1},
      });

      solver.trySelect(1);
      solver.trySelect(4);

      expect(solver.isReachable(2)).toEqual(true);
      solver.trySelect(2);

      expect(solver.allocated(1)).toEqual([1, 1]);
      expect(solver.allocated(2)).toEqual([2, 2]);
    });
  });

  describe('Graph', () => {
    describe('prune', () => {
      it('prunes single dependency', () => {
        const g = new Graph({
          1 : {requires : [], points : 1},
          2 : {requires : [ 1 ], points : 1},
        });

        expect(g.prune(1)).toEqual(new Graph({}));
      });
    });
  });
});
