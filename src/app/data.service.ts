import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  public trees: TalentTree[];

  constructor() {
    this.trees = (window as any).WH.pageData["wow.talentCalcDragonflight.trees"];
  }
}

export interface TalentTree {
  // Actually id for which spec or class.
  id: number;

  talents: {
    [cell: number]: Talent[],
  }
}

export interface Talent {
  cell: number;
  spells: Spell[];
  requires: number[];
  requiredPoints: number;
}

export interface Spell {
  icon: string;
}
