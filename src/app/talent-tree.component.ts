import {
  Component,
  ElementRef,
  HostBinding,
  Input,
  QueryList,
  SimpleChanges,
  ViewChildren
} from '@angular/core';

import {Class, Spec, TalentTree} from './data.service';
import {TalentComponent} from './talent.component';
import {Selection, TreeSolver} from './tree_solver';
import {UrlState} from './url_state.service';

const MARGIN_OVERRIDE: {[id: number]: string} = {
  71 : '0px 0px',
  72 : '0px 0px',
  73 : '0px 8px',
  4 : '0px 0px',
  12 : '0px 8px',
  577 : '0px 0px',
};

@Component({
  selector : 'talent-tree',
  templateUrl : './talent-tree.component.html',
  styleUrls : [ './talent-tree.component.css' ]
})
export class TalentTreeComponent {
  @Input() tree!: TalentTree;
  @Input('class') class_!: Class;
  @Input() spec!: Spec;

  columns = 17;
  get rows() {
    const largestId =
        Math.max(...Object.keys(this.tree.talents).map(id => +id));
    return this.gridRow(largestId);
  }

  @ViewChildren(TalentComponent) talentElements!: QueryList<TalentComponent>;
  showConnections = false;

  maxPoints!: number;

  solver!: TreeSolver;

  constructor(private readonly url: UrlState) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tree']) {
      console.debug('Selected tree', this.tree.id);
      this.maxPoints = this.defaultMaxPoints(this.tree);

      const selection =
          changes['tree'].firstChange ? this.url.getState().selection : {};
      this.solver = TreeSolver.fromTree(this.tree, this.maxPoints, selection);

      this.showConnectionsAfterTimeout();
      this.calculateColumnAdjustment();
    }
  }

  ngAfterViewInit() { this.showConnectionsAfterTimeout(); }

  private showConnectionsAfterTimeout() {
    this.showConnections = false;
    setTimeout(() => { this.showConnections = true; }, 0);
  }

  defaultMaxPoints(tree: TalentTree): number {
    const isClassTree = tree.id <= 13;
    return isClassTree ? 31 : 30;
  }

  private columnMap = new Map<number, number>();

  private calculateColumnAdjustment() {
    this.columnMap = new Map();

    const columns =
        new Set(Object.keys(this.tree.talents).map(c => this.gridColumn(+c)));
    const sorted = [...columns ];
    sorted.sort((a, b) => a - b);

    let realColumn = 1;
    for (const s of sorted) {
      this.columnMap.set(s, realColumn++);
    }
  }

  gridColumn(cell: number): number {
    const naive = cell % this.columns;
    return this.columnMap.get(naive) ?? naive;
  }

  gridRow(cell: number): number { return Math.floor(cell / this.columns) + 1; }

  onTalentClick(id: number) {
    this.solver.trySelect(id);
    this.onSelectionChange();
  }

  onTalentRightClick(id: number) {
    this.solver.tryUnselect(id);
    this.onSelectionChange();
  }

  private onSelectionChange() {
    const selection: Selection = {};

    for (const id of this.solver.nodeIds()) {
      if (this.solver.isSelected(id)) {
        selection[id] = this.solver.allocated(id)[0];
      }
    }

    this.url.setSelection(selection);
  }

  getElement(talentId: number): ElementRef {
    const el = this.talentElements.find(el => el.talentId === talentId);
    if (el == null) {
      throw new Error(`Missing talent with id ${talentId}`);
    }
    return el.element;
  }

  connections(): Array<[ number, number ]> {
    return [...Object.entries(this.tree.talents) ].flatMap(
        ([ id, talents ]) => {
          const talent = talents[0];
          return talent.requires.map(r => [r, +id] as [number, number]);
        });
  }

  trackByIndex(i: number): number { return i; }

  margin(): string { return MARGIN_OVERRIDE[this.tree.id]; }
}
