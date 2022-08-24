import {Component, HostBinding, Input, OnInit} from '@angular/core';

@Component({
  selector : 'wowhead-icon',
  templateUrl : './wowhead-icon.component.html',
  styleUrls : [ './wowhead-icon.component.css' ]
})
export class WowheadIconComponent implements OnInit {
  @Input() icon: string = '';
  @Input() alt: string|null = null;

  constructor() {}

  ngOnInit(): void {}
}
