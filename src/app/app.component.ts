import {Component, Inject} from '@angular/core';

import {
  DataService,
  Spell,
  Talent,
  TalentTree,
  TREE_META
} from './data.service';
import {maxByKey} from './utils';

@Component({
  selector : 'app-root',
  templateUrl : './app.component.html',
  styleUrls : [ './app.component.css' ],
})
export class AppComponent {
  trees: TalentTree[];
  tree: TalentTree|null = null;

  constructor(readonly dataService: DataService) {
    this.trees = dataService.trees;

    this.trees.sort((a, b) => a.id - b.id);
  }

  selectTree(tree: TalentTree) {
    console.log(`Selecting tree ${tree.id}`);
    this.tree = tree;
  }

  icon(tree: TalentTree): string {
    const override = TREE_META[tree.id];
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
