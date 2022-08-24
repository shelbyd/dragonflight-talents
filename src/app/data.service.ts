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

export const CLASSES: Class[] = [
  {
    "id" : 6,
    "icon" : "class_deathknight",
    "name" : "Death Knight",
    "slug" : "death-knight",
    "color" : "#c41e3a"
  },
  {
    "id" : 12,
    "icon" : "class_demonhunter",
    "name" : "Demon Hunter",
    "slug" : "demon-hunter",
    "color" : "#a330c9"
  },
  {
    "id" : 11,
    "icon" : "class_druid",
    "name" : "Druid",
    "slug" : "druid",
    "color" : "#ff7c0a"
  },
  {
    "id" : 13,
    "icon" : "class_evoker",
    "name" : "Evoker",
    "slug" : "evoker",
    "color" : "#33937f"
  },
  {
    "id" : 3,
    "icon" : "class_hunter",
    "name" : "Hunter",
    "slug" : "hunter",
    "color" : "#aad372"
  },
  {
    "id" : 8,
    "icon" : "class_mage",
    "name" : "Mage",
    "slug" : "mage",
    "color" : "#3fc7eb"
  },
  {
    "id" : 10,
    "icon" : "class_monk",
    "name" : "Monk",
    "slug" : "monk",
    "color" : "#00ff98"
  },
  {
    "id" : 2,
    "icon" : "class_paladin",
    "name" : "Paladin",
    "slug" : "paladin",
    "color" : "#f48cba"
  },
  {
    "id" : 5,
    "icon" : "class_priest",
    "name" : "Priest",
    "slug" : "priest",
    "color" : "#ffffff"
  },
  {
    "id" : 4,
    "icon" : "class_rogue",
    "name" : "Rogue",
    "slug" : "rogue",
    "color" : "#fff468"
  },
  {
    "id" : 7,
    "icon" : "class_shaman",
    "name" : "Shaman",
    "slug" : "shaman",
    "color" : "#0070dd"
  },
  {
    "id" : 9,
    "icon" : "class_warlock",
    "name" : "Warlock",
    "slug" : "warlock",
    "color" : "#8788ee"
  },
  {
    "id" : 1,
    "icon" : "class_warrior",
    "name" : "Warrior",
    "slug" : "warrior",
    "color" : "#c69b6d"
  }
];

export const SPECS: Spec[] = [
  {
    "id" : 250,
    "icon" : "spell_deathknight_bloodpresence",
    "name" : "Blood",
    "slug" : "blood",
    "classId" : 6
  },
  {
    "id" : 251,
    "icon" : "spell_deathknight_frostpresence",
    "name" : "Frost",
    "slug" : "frost",
    "classId" : 6
  },
  {
    "id" : 252,
    "icon" : "spell_deathknight_unholypresence",
    "name" : "Unholy",
    "slug" : "unholy",
    "classId" : 6
  },
  {
    "id" : 577,
    "icon" : "ability_demonhunter_specdps",
    "name" : "Havoc",
    "slug" : "havoc",
    "classId" : 12
  },
  {
    "id" : 581,
    "icon" : "ability_demonhunter_spectank",
    "name" : "Vengeance",
    "slug" : "vengeance",
    "classId" : 12
  },
  {
    "id" : 102,
    "icon" : "spell_nature_starfall",
    "name" : "Balance",
    "slug" : "balance",
    "classId" : 11
  },
  {
    "id" : 103,
    "icon" : "ability_druid_catform",
    "name" : "Feral",
    "slug" : "feral",
    "classId" : 11
  },
  {
    "id" : 104,
    "icon" : "ability_racial_bearform",
    "name" : "Guardian",
    "slug" : "guardian",
    "classId" : 11
  },
  {
    "id" : 105,
    "icon" : "spell_nature_healingtouch",
    "name" : "Restoration",
    "slug" : "restoration",
    "classId" : 11
  },
  {
    "id" : 1467,
    "icon" : "classicon_evoker_devastation",
    "name" : "Devastation",
    "slug" : "devastation",
    "classId" : 13
  },
  {
    "id" : 1468,
    "icon" : "classicon_evoker_preservation",
    "name" : "Preservation",
    "slug" : "preservation",
    "classId" : 13
  },
  {
    "id" : 253,
    "icon" : "ability_hunter_bestialdiscipline",
    "name" : "Beast Mastery",
    "slug" : "beast-mastery",
    "classId" : 3
  },
  {
    "id" : 254,
    "icon" : "ability_hunter_focusedaim",
    "name" : "Marksmanship",
    "slug" : "marksmanship",
    "classId" : 3
  },
  {
    "id" : 255,
    "icon" : "ability_hunter_camouflage",
    "name" : "Survival",
    "slug" : "survival",
    "classId" : 3
  },
  {
    "id" : 62,
    "icon" : "spell_holy_magicalsentry",
    "name" : "Arcane",
    "slug" : "arcane",
    "classId" : 8
  },
  {
    "id" : 63,
    "icon" : "spell_fire_firebolt02",
    "name" : "Fire",
    "slug" : "fire",
    "classId" : 8
  },
  {
    "id" : 64,
    "icon" : "spell_frost_frostbolt02",
    "name" : "Frost",
    "slug" : "frost",
    "classId" : 8
  },
  {
    "id" : 268,
    "icon" : "spell_monk_brewmaster_spec",
    "name" : "Brewmaster",
    "slug" : "brewmaster",
    "classId" : 10
  },
  {
    "id" : 270,
    "icon" : "spell_monk_mistweaver_spec",
    "name" : "Mistweaver",
    "slug" : "mistweaver",
    "classId" : 10
  },
  {
    "id" : 269,
    "icon" : "spell_monk_windwalker_spec",
    "name" : "Windwalker",
    "slug" : "windwalker",
    "classId" : 10
  },
  {
    "id" : 65,
    "icon" : "spell_holy_holybolt",
    "name" : "Holy",
    "slug" : "holy",
    "classId" : 2
  },
  {
    "id" : 66,
    "icon" : "ability_paladin_shieldofthetemplar",
    "name" : "Protection",
    "slug" : "protection",
    "classId" : 2
  },
  {
    "id" : 70,
    "icon" : "spell_holy_auraoflight",
    "name" : "Retribution",
    "slug" : "retribution",
    "classId" : 2
  },
  {
    "id" : 256,
    "icon" : "spell_holy_powerwordshield",
    "name" : "Discipline",
    "slug" : "discipline",
    "classId" : 5
  },
  {
    "id" : 257,
    "icon" : "spell_holy_guardianspirit",
    "name" : "Holy",
    "slug" : "holy",
    "classId" : 5
  },
  {
    "id" : 258,
    "icon" : "spell_shadow_shadowwordpain",
    "name" : "Shadow",
    "slug" : "shadow",
    "classId" : 5
  },
  {
    "id" : 259,
    "icon" : "ability_rogue_deadlybrew",
    "name" : "Assassination",
    "slug" : "assassination",
    "classId" : 4
  },
  {
    "id" : 260,
    "icon" : "ability_rogue_waylay",
    "name" : "Outlaw",
    "slug" : "outlaw",
    "classId" : 4
  },
  {
    "id" : 261,
    "icon" : "ability_stealth",
    "name" : "Subtlety",
    "slug" : "subtlety",
    "classId" : 4
  },
  {
    "id" : 262,
    "icon" : "spell_nature_lightning",
    "name" : "Elemental",
    "slug" : "elemental",
    "classId" : 7
  },
  {
    "id" : 263,
    "icon" : "spell_shaman_improvedstormstrike",
    "name" : "Enhancement",
    "slug" : "enhancement",
    "classId" : 7
  },
  {
    "id" : 264,
    "icon" : "spell_nature_magicimmunity",
    "name" : "Restoration",
    "slug" : "restoration",
    "classId" : 7
  },
  {
    "id" : 265,
    "icon" : "spell_shadow_deathcoil",
    "name" : "Affliction",
    "slug" : "affliction",
    "classId" : 9
  },
  {
    "id" : 266,
    "icon" : "spell_shadow_metamorphosis",
    "name" : "Demonology",
    "slug" : "demonology",
    "classId" : 9
  },
  {
    "id" : 267,
    "icon" : "spell_shadow_rainoffire",
    "name" : "Destruction",
    "slug" : "destruction",
    "classId" : 9
  },
  {
    "id" : 71,
    "icon" : "ability_warrior_savageblow",
    "name" : "Arms",
    "slug" : "arms",
    "classId" : 1
  },
  {
    "id" : 72,
    "icon" : "ability_warrior_innerrage",
    "name" : "Fury",
    "slug" : "fury",
    "classId" : 1
  },
  {
    "id" : 73,
    "icon" : "ability_warrior_defensivestance",
    "name" : "Protection",
    "slug" : "protection",
    "classId" : 1
  }
];
