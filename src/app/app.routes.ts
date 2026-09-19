import { Routes } from '@angular/router';
import {ServiceReportFormComponent} from './components/service-report-form/service-report-form.component';
import {ShareTargetComponent} from './components/share-target/share-target.component';

export const routes: Routes = [
  { path: '', component: ServiceReportFormComponent },
  { path: 'share-target', component: ShareTargetComponent },
  { path: '**', redirectTo: '' }
];
