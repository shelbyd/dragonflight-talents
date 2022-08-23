import {Component, HostBinding, Input, OnInit} from '@angular/core';

@Component({
  selector : 'wowhead-icon',
  templateUrl : './wowhead-icon.component.html',
  styleUrls : [ './wowhead-icon.component.css' ]
})
export class WowheadIconComponent implements OnInit {
  @Input() icon: string = '';

  @HostBinding('style.backgroundImage')
  get backgroundImage() {
    const ability =
        `https://wow.zamimg.com/images/wow/icons/large/${this.icon}.jpg`;
    const fallback =
        "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg";
    return `url("${ability}"), url("${fallback}")`;
  }

  constructor() {}

  ngOnInit(): void {}
}
