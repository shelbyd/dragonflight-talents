import {Injectable} from '@angular/core';

const page = "https://www.wowhead.com/beta/talent-calc";

@Injectable({providedIn : 'root'})
export class DataService {
  async load(): Promise<Data> {
    const response = await fetch("/assets/data.json");
    const json = await response.json();

    return {
      trees: json.trees,
      specs: json.specs,
      classes: json.classes,
    };
  }
}

export interface Data {
  trees: TalentTree[];
  classes: Class[];
  specs: Spec[];
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

  type: TalentType;
}

export enum TalentType {
  ABILITY = 1,
  PASSIVE = 2,
  CHOICE = 3,
}

export interface Spell {
  icon: string;
  points: number;

  // SpellId
  spell: number;
}

export interface TreeMeta {
  icon: string;
  id: number;
}

export interface Class {
  id: number;
  icon: string;
  name: string;
  slug: string;
  color: string;
}

export interface Spec {
  id: number;
  icon: string;
  name: string;
  slug: string;
  classId: number;
}
