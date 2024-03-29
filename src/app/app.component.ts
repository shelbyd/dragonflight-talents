import {Component, Inject} from '@angular/core';

import {
  Class,
  DataService,
  Spec,
  Spell,
  Talent,
  TalentTree,
} from './data.service';
import {Selection, TreeSolver} from './tree_solver';
import {UrlState} from './url_state.service';
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

  constructor(dataService: DataService, private readonly url: UrlState) {
    dataService.load().then(data => {
      this.specs = data.specs;
      this.classes = data.classes;

      this.trees = data.trees;
      this.trees.sort((a, b) => a.id - b.id);

      this.loaded = true;
      this.selectFromUrl();

      if (window.location.hostname === 'localhost') {
        this.debugInitialTreeConstrain();
      }
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

  selectClass(c: Class) {
    if (c === this.selectedClass)
      return;

    this.selectedClass = c;
    this.selectedSpec = null;

    this.url.setClass(c.slug);
  }

  selectSpec(s: Spec) {
    if (s === this.selectedSpec)
      return;

    this.selectedSpec = s;

    this.url.setSpec(s.slug);
  }

  private selectFromUrl() {
    const urlState = this.url.getState();

    this.selectedClass =
        this.classes.find(c => c.slug === urlState.klass) ?? null;
    this.selectedSpec = this.specs.find(
        s => s.slug === urlState.spec && s.classId === this.selectedClass!.id)
        ?? this.classes.map(c => ({...c, classId : c.id}))
               .find(c => c.slug === urlState.spec)
        ?? null;
  }

  private async debugInitialTreeConstrain() {
    const timings: any[] = [];

    for (const klass of this.classes) {
      for (const spec of this.specsFor(klass)) {
        console.log('klass.name, spec.name', klass.name, spec.name);

        const tree = this.trees.find(t => t.id === spec.id)!;
        TreeSolver.fromTree(tree, spec.id <= 13 ? 31 : 30, {}, (constrain) => {
          const start = window.performance.now();
          const result = constrain();
          const end = window.performance.now();

          const timing = {
            class : klass.name,
            spec : spec.name,
            constrainedIn : Math.ceil(end - start),
          };
          console.log('timing', timing);
          timings.push(timing);

          return result;
        });
        await new Promise(r => setTimeout(r, 0));
      }
    }

    console.table(timings);
    (window as any).rework['validity'].report();
    (window as any).rework['constrain'].report();
  }
}
