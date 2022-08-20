import {Component, Inject} from '@angular/core';

import {DataService, TalentTree} from './data.service';

const rejectNodes = new Set([
  // 80,
  // 68,  72,  87,  91,  95,  97,  99,  102, 106,
  // 108, 110, 112, 114, 121, 125, 127, 131, 133, 138, 142,
  // 144, 146, 150, 155, 157, 161, 163, 165, 169,
]);

@Component({
  selector : 'app-root',
  templateUrl : './app.component.html',
  styles : [ `
    :host {
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
    }

    talent-tree {
      flex-grow: 1;
    }
    ` ]
})
export class AppComponent {
  monkTree: TalentTree;

  constructor(readonly dataService: DataService) {
    this.monkTree = dataService.trees.find(t => t.id === 270)!;
    for (const id of rejectNodes) {
      delete this.monkTree.talents[id];
    }
    console.log(Object.keys(this.monkTree.talents).map(n => +n));
  }
}
