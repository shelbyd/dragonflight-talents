import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { TalentTreeComponent } from './talent-tree.component';
import { TalentComponent } from './talent.component';

@NgModule({
  declarations: [
    AppComponent,
    TalentTreeComponent,
    TalentComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
