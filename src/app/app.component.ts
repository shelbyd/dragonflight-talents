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

  specs(): Spec[] {
    if (this.selectedClass == null)
      return [];

    const classId = this.selectedClass.id;

    const base = {...this.selectedClass, classId};
    return [ base, ...SPECS.filter(s => s.classId === classId) ];
  }

  selectedTree(): TalentTree|null {
    const spec = this.selectedSpec;
    if (spec == null)
      return null;

    return this.trees.find(t => t.id === spec.id) ?? null;
  }

  icon(tree: TalentTree): string {
    const override = SPECS.find(s => s.id === tree.id);
    if (override != null) {
      return override.icon;
    }

    const classOccurrence = Object.values(tree.talents)
                                .flatMap(t => t)
                                .flatMap(t => t.spells)
                                .map(sp => sp.icon)
                                .map(icon => icon.match(/ability_([^_]+)_\w+/))
                                .map(match => match ? match[1] : null)
                                .reduce((map, cl) => {
                                  if (cl != null) {
                                    map.set(cl, (map.get(cl) || 0) + 1);
                                  }
                                  return map;
                                }, new Map());
    const max = maxByKey([...classOccurrence.entries() ], entry => entry[1]);
    if (max != null) {
      return `class_${max[0]}`;
    }

    return '';
  }
}
