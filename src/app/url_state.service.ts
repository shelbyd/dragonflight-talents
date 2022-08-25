import {Injectable} from '@angular/core';

import {Selection} from './tree_solver';

@Injectable({providedIn : 'root'})
export class UrlState {
  private klass?: string;
  private spec?: string;

  private selection: Selection;
  private choices: Selection;

  constructor() {
    const state = this.getState();
    this.klass = state.klass;
    this.spec = state.spec;
    this.selection = state.selection;
    this.choices = state.choices;
  }

  getState(): State {
    const url = window.location;
    const pathParts = url.pathname.split('/').slice(1);

    const classSlug = pathParts[0];
    const specSlug = pathParts[1];

    const selection: Selection = {};
    const choices: Selection = {};

    new URLSearchParams(url.search).forEach((value, key) => {
      let obj = selection;

      if (key.startsWith('choice')) {
        key = key.slice(6);
        obj = choices;
      }

      const asInt = parseInt(key);
      if (isNaN(asInt))
        return;

      obj[asInt] = +value;
    });

    return {
      klass : classSlug,
      spec : specSlug,
      selection,
      choices,
    };
  }

  setClass(slug: string|null) {
    this.klass = slug ?? undefined;
    this.clearSpec();

    this.updateUrl();
  }

  clearSpec() {
    delete this.spec;
    this.clearSelection();
  }

  setSpec(slug: string|null) {
    this.spec = slug ?? undefined;
    this.clearSelection();

    this.updateUrl();
  }

  clearSelection() {
    this.selection = {};
    this.choices = {};
  }

  setSelection(selection: Selection) {
    this.selection = selection;
    this.updateUrl();
  }

  private updateUrl() {
    window.history.replaceState(null, 'unused', this.buildUrl());
  }

  private buildUrl(): string {
    if (this.klass == null)
      return '';
    const withClass = `/${this.klass}`;

    if (this.spec == null)
      return withClass;
    const withSpec = `${withClass}/${this.spec}`;

    const selectedParams = [...Object.entries(this.selection) ].map(
        entry => `${entry[0]}=${entry[1]}`);
    const choiceParams = [...Object.entries(this.choices) ].map(
        entry => `choice${entry[0]}=${entry[1]}`);

    const params = [...selectedParams, ...choiceParams ];
    if (params.length === 0)
      return withSpec;

    return `${withSpec}?${params.join('&')}`;
  }

  setChoice(id: number, index: number) {
    this.choices[id] = index;
    this.updateUrl();
  }
  clearChoice(id: number) {
    delete this.choices[id];
    this.updateUrl();
  }
}

export interface State {
  klass?: string;
  spec?: string;
  selection: Selection;
  choices: Selection;
}
