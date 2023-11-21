import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgbDatepickerModule, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { HomeComponent } from './home/home.component';
import { FormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';
import { CommonModule, HashLocationStrategy, LocationStrategy } from '@angular/common';
import { HighchartsChartComponent, HighchartsChartModule } from 'highcharts-angular';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,

  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgbModule,
    NgbDatepickerModule,
    FormsModule,
    JsonPipe,
    HttpClientModule,
    HighchartsChartModule,
 
  ],
  providers: [
    HomeComponent,
   [{provide: LocationStrategy, useClass: HashLocationStrategy}]
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
