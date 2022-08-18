import {TalentTree} from './data.service';

export class TreeSolver {
  private selected: {[id: number]: boolean} = {};

  public static fromUrl(tree: TalentTree): TreeSolver {
    return new TreeSolver();
  }

  public trySelect(id: number) {
    this.selected[id] = true;
  }

  public isSelected(id: number): boolean {
    return this.selected[id] || false;
  }
}
