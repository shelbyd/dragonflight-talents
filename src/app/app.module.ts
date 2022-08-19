import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { TalentTreeComponent } from './talent-tree.component';
import { TalentComponent } from './talent.component';
import { ConnectionComponent } from './connection.component';

@NgModule({
  declarations: [
    AppComponent,
    TalentTreeComponent,
    TalentComponent,
    ConnectionComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
