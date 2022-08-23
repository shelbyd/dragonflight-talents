import {Injectable} from '@angular/core';

@Injectable({providedIn : 'root'})
export class DataService {
  public trees: TalentTree[];

  constructor() {
    this.trees =
        (window as any).WH.pageData["wow.talentCalcDragonflight.trees"];
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

export const TREE_META: {[id: number]: TreeMeta} = {
  62 : {"icon" : "spell_holy_magicalsentry", "id" : 62},
  63 : {"icon" : "spell_fire_firebolt02", "id" : 63},
  64 : {"icon" : "spell_frost_frostbolt02", "id" : 64},
  65 : {"icon" : "spell_holy_holybolt", "id" : 65},
  66 : {"icon" : "ability_paladin_shieldofthetemplar", "id" : 66},
  70 : {"icon" : "spell_holy_auraoflight", "id" : 70},
  71 : {"icon" : "ability_warrior_savageblow", "id" : 71},
  72 : {"icon" : "ability_warrior_innerrage", "id" : 72},
  73 : {"icon" : "ability_warrior_defensivestance", "id" : 73},
  102 : {"icon" : "spell_nature_starfall", "id" : 102},
  103 : {"icon" : "ability_druid_catform", "id" : 103},
  104 : {"icon" : "ability_racial_bearform", "id" : 104},
  105 : {"icon" : "spell_nature_healingtouch", "id" : 105},
  250 : {"icon" : "spell_deathknight_bloodpresence", "id" : 250},
  251 : {"icon" : "spell_deathknight_frostpresence", "id" : 251},
  252 : {"icon" : "spell_deathknight_unholypresence", "id" : 252},
  253 : {"icon" : "ability_hunter_bestialdiscipline", "id" : 253},
  254 : {"icon" : "ability_hunter_focusedaim", "id" : 254},
  255 : {"icon" : "ability_hunter_camouflage", "id" : 255},
  256 : {"icon" : "spell_holy_powerwordshield", "id" : 256},
  257 : {"icon" : "spell_holy_guardianspirit", "id" : 257},
  258 : {"icon" : "spell_shadow_shadowwordpain", "id" : 258},
  259 : {"icon" : "ability_rogue_deadlybrew", "id" : 259},
  260 : {"icon" : "ability_rogue_waylay", "id" : 260},
  261 : {"icon" : "ability_stealth", "id" : 261},
  262 : {"icon" : "spell_nature_lightning", "id" : 262},
  263 : {"icon" : "spell_shaman_improvedstormstrike", "id" : 263},
  264 : {"icon" : "spell_nature_magicimmunity", "id" : 264},
  265 : {"icon" : "spell_shadow_deathcoil", "id" : 265},
  266 : {"icon" : "spell_shadow_metamorphosis", "id" : 266},
  267 : {"icon" : "spell_shadow_rainoffire", "id" : 267},
  268 : {"icon" : "spell_monk_brewmaster_spec", "id" : 268},
  269 : {"icon" : "spell_monk_windwalker_spec", "id" : 269},
  270 : {"icon" : "spell_monk_mistweaver_spec", "id" : 270},
  577 : {"icon" : "ability_demonhunter_specdps", "id" : 577},
  581 : {"icon" : "ability_demonhunter_spectank", "id" : 581},
  1467 : {"icon" : "classicon_evoker_devastation", "id" : 1467},
  1468 : {"icon" : "classicon_evoker_preservation", "id" : 1468}
}
