import { Injectable } from '@angular/core';
// import { COMPONENTS } from '../../../../../main/content/pages/integration.components';
import { DummyService } from './dummy.service';

@Injectable({
  providedIn: 'root'
})
export class SetUpDummyDataService {

  constructor(private dummyService: DummyService) { }

  // public initializeDummyData(): void {
  //   const functionalities = COMPONENTS
  //     .filter(c => c.test)
  //     .map(c => c.test);

  //   functionalities.forEach(functionality => {
  //     this.setUpByIntegration(functionality);
  //   });
  // }

  // private setUpByIntegration(functionality: any): void {
  //   if (!functionality) return;

  //   functionality.forEach((integration: any) => {
  //     integration.dataset.forEach((data: any) => {
  //       this.dummyService.httpPost(integration.url, data).subscribe();
  //     });
  //   });
  // }
}