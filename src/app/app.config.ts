import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  APP_INITIALIZER,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { LocalStorageService } from './services/local-storage.service';

function initializeAppData(localStorageService: LocalStorageService) {
  return () => localStorageService.initializeData();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideAnimations(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAppData,
      deps: [LocalStorageService],
      multi: true,
    },
  ],
};
