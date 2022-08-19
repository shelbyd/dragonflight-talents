import {
  Component,
  ElementRef,
  HostBinding,
  Input,
  QueryList,
  ViewChildren
} from '@angular/core';

import {TalentTree} from './data.service';
import {TalentComponent} from './talent.component';
import {TreeSolver} from './tree_solver';

@Component({
  selector : 'talent-tree',
  templateUrl : './talent-tree.component.html',
  styleUrls : [ './talent-tree.component.css' ]
})
export class TalentTreeComponent {
  @Input() tree!: TalentTree;

  @HostBinding('style.gridTemplateColumns') columns = 17;
  @HostBinding('style.gridTemplateRows') rows = 10;

  @ViewChildren(TalentComponent) talentElements!: QueryList<TalentComponent>;
  showConnections = false;

  solver!: TreeSolver;

  ngOnInit() {
    this.solver = TreeSolver.fromUrl(this.tree);
    console.log('this.tree', this.tree);
  }

  ngAfterViewInit() {
    setTimeout(() => { this.showConnections = true; }, 0);
  }

  gridColumn(cell: number): number { return cell % this.columns + 1; }

  gridRow(cell: number): number { return Math.floor(cell / this.columns) + 1; }

  onTalentClick(id: number) { this.solver.trySelect(id); }

  onTalentRightClick(id: number) { this.solver.tryUnselect(id); }

  getElement(talentId: number): ElementRef {
    return this.talentElements.find(el => el.talentId === talentId)!.element;
  }

  connections(): Array<[ number, number ]> {
    return [...Object.entries(this.tree.talents) ].flatMap(
        ([ id, talents ]) => {
          const talent = talents[0];
          return talent.requires.map(r => [r, +id] as [number, number]);
        });
  }

  trackByIndex(i: number): number { return i; }
}
