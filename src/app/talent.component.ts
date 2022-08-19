import {Component, HostBinding, Input} from '@angular/core';

import {Talent} from './data.service';
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

  get talent() { return this.talentList[0]; }

  get backgroundImage() {
    const ability = `https://wow.zamimg.com/images/wow/icons/large/${
        this.talent.spells[0].icon}.jpg`;
    const fallback =
        "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg";
    return `url("${ability}"), url("${fallback}")`;
  };
}
