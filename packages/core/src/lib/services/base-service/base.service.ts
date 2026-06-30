import { inject } from '@angular/core';
import { LocalStorageService } from '../local-storage/local-storage.service';
import { MessageService } from '../message/message.service';

export abstract class BaseService {

  protected messageService: MessageService;
  protected localStorageService: LocalStorageService;

  constructor() {
     try {
        this.messageService = inject(MessageService);
        this.localStorageService = inject(LocalStorageService);
     } catch (e) {
        console.error("FALLÓ LA INYECCIÓN. Asegurate de que MessageService y LocalStorageService estén provistos en 'root'.", e);
        throw e;
     }
  }

  protected log(message: string) {
    if (this.messageService) {
        this.messageService.add('EService: ' + message); 
    } else {
        console.warn('MessageService no está disponible para loguear:', message);
    }
  }
}