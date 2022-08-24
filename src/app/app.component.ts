import {Component, Inject} from '@angular/core';

import {
  Class,
  DataService,
  Spec,
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
  loaded = false;

  trees!: TalentTree[];
  classes!: Class[];
  specs!: Spec[];

  selectedClass: Class|null = null;
  selectedSpec: Spec|null = null;

  constructor(dataService: DataService) {
    dataService.load().then(data => {
      this.specs = data.specs;
      this.classes = data.classes;

      this.trees = data.trees;
      this.trees.sort((a, b) => a.id - b.id);

      this.loaded = true;
    });
  }

  specsFor(cl: Class): Spec[] {
    const classId = cl.id;

    const base = {...cl, classId};
    return [ base, ...this.specs.filter(s => s.classId === classId) ];
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
