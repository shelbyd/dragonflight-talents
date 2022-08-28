import {Injectable} from '@angular/core';

@Injectable({providedIn: 'root'})
export class Analytics {
  private get gtag(): any {
    const fromWindow = (window as any).gtag;
    if (fromWindow != null) return fromWindow;
    return () => {};
  }

  public treeConstrain(millis: number, treeId: number) {
    const timeToText = [
      [30, 'instant'],
      [100, 'fast'],
      [300, 'ok'],
      [1000, 'slow'],
      [Infinity, 'unusable'],
    ];

    const timeText = timeToText.find(entry => millis <= entry[0])?.[1] ?? 'unknown';

    this.gtag('event', 'tree_constrain', {
      'event_category': 'performance',
      'event_label': 'tree_constrain',
      'value': timeText,
      'millis': Math.ceil(millis),
      'tree_id': treeId.toString(),
    });
  }
}
