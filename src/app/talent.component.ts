import {
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output
} from '@angular/core';

import {Spell, Talent, TalentType} from './data.service';
import {UrlState} from './url_state.service';
import {TreeSolver} from './tree_solver';

@Component({
  selector : 'talent',
  templateUrl : './talent.component.html',
  styleUrls : [ './talent.component.css' ]
})
export class TalentComponent {
  @Input('talent') talentList!: Talent[];
  @Input() talentId!: number;
  @Input() solver!: TreeSolver;

  @Output() talentClick = new EventEmitter<{}>();
  @Output() talentClear = new EventEmitter<{}>();

  get talent() { return this.talentList[0]; }

  get talentType() {
    const type = this.talent.type;
    const known = {
      [TalentType.ABILITY] : 'ability',
      [TalentType.PASSIVE] : 'passive',
      [TalentType.CHOICE] : 'choice',
    }[type];
    if (known == null) {
      throw new Error(`unknown: ${type}`);
    }
    return known;
  }

  constructor(readonly element: ElementRef, private readonly url: UrlState) {}

  showIdOverlay = false;

  ngOnInit() {
    const searchParams = new URLSearchParams(window.location.search);
    this.showIdOverlay = searchParams.has('debug');

    if (this.talent.spells.length > 1) {
      this.selectedIndex = this.url.getState().choices[this.talentId];
    }
  }

  getBackgroundImage(spell: Spell) {
    const ability =
        `https://wow.zamimg.com/images/wow/icons/large/${spell.icon}.jpg`;
    const fallback =
        "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg";
    return `url("${ability}"), url("${fallback}")`;
  }

  private selectedIndex: number|null = null;

  selectSpell(index: number) {
    this.selectedIndex = index;
    this.talentClick.emit({});

    if (this.talent.spells.length > 1) {
      this.url.setChoice(this.talentId, index);
    }
  }

  clearSpell(index: number) {
    this.selectedIndex = null;
    this.talentClear.emit({});

    this.url.clearChoice(this.talentId);
  }

  spellChoices(): Spell[] {
    if (this.selectedIndex != null) {
      return [this.talent.spells[this.selectedIndex]];
    }
    return this.talent.spells;
  }
}
