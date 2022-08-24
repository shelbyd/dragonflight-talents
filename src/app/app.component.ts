import {Component, Inject} from '@angular/core';

import {
  Class,
  CLASSES,
  DataService,
  Spec,
  SPECS,
  Spell,
  Talent,
  TalentTree,
} from './data.service';
import {maxByKey} from './utils';

@Component({
  selector : 'app-root',
  templateUrl : './app.component.html',
  styleUrls : [ './app.component.css' ],
})
export class AppComponent {
  trees: TalentTree[];

  selectedClass: Class|null = null;
  selectedSpec: Spec|null = null;

  constructor(readonly dataService: DataService) {
    this.trees = dataService.trees;

    this.trees.sort((a, b) => a.id - b.id);
  }

  classes(): Class[] { return CLASSES; }

  specs(cl: Class): Spec[] {
    const classId = cl.id;

    const base = {...cl, classId};
    return [ base, ...SPECS.filter(s => s.classId === classId) ];
  }

  hasTree(v: Class|Spec): boolean {
    return this.trees.some(t => t.id === v.id);
  }

  selectedTree(): TalentTree|null {
    const spec = this.selectedSpec;
    if (spec == null)
      return null;

    return this.trees.find(t => t.id === spec.id) ?? null;
  }
}
