import {Component, Inject} from '@angular/core';

import {DataService, TalentTree} from './data.service';

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
  }
}
