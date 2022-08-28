import {Injectable} from '@angular/core';

@Injectable({providedIn: 'root'})
export class Analytics {
  private get gtag(): any {
    const fromWindow = (window as any).gtag;
    if (fromWindow != null) return fromWindow;
    return () => {};
  }

  public treeConstrain(millis: number, treeId: number) {
    this.gtag('event', 'tree_constrain', {
      'event_category': 'performance',
      'event_label': 'tree_constrain',
      'value': Math.ceil(millis),
      'tree_id': treeId.toString(),
    });
  }
}
