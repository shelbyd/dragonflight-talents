import {Component, Input, HostBinding} from '@angular/core';

import {TalentTree} from './data.service';
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

  solver!: TreeSolver;

  ngOnInit() {
    this.solver = TreeSolver.fromUrl(this.tree);
    console.log('this.tree', this.tree);
  }

  gridColumn(cell: number): number {
    return cell % this.columns + 1;
  }

  gridRow(cell: number): number {
    return Math.floor(cell / this.columns) + 1;
  }

  onTalentClick(id: number) {
    this.solver.trySelect(id);
  }

  onTalentRightClick(id: number) {
    this.solver.tryUnselect(id);
  }
}
