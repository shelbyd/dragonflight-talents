import {Component, HostBinding, Input} from '@angular/core';

import {Talent} from './data.service';

@Component({
  selector : 'talent',
  templateUrl : './talent.component.html',
  styleUrls : [ './talent.component.css' ]
})
export class TalentComponent {
  @Input('talent') talentList!: Talent[];

  get talent() { return this.talentList[0]; }

  @HostBinding('style.background')
  get backgroundColor() {
    const ability = `https://wow.zamimg.com/images/wow/icons/large/${this.talent.spells[0].icon}.jpg`;
    const fallback = "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg";
    return `url("${ability}"), url("${fallback}")`;
  };

  // @HostBinding('style.backgroundImage')
  // get backgroundImage() {
  //   return
  //   `url("https://wow.zamimg.com/images/wow/icons/large/${this.talent.spells[0].icon}.jpg"),
  //   url("https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg");`;
  // }

  ngOnInit() { console.log('this.talent.spells', this.talent.spells); }
}
