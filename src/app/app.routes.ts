import { Routes } from '@angular/router';
import { Admin } from './pages/admin/admin';
import { Auction } from './pages/auction/auction';
import { Teams } from './pages/teams/teams';
import { Players } from './pages/players/players';

export const routes: Routes = [
  { path: '', redirectTo: '/auction', pathMatch: 'full' },
  { path: 'admin', component: Admin },
  { path: 'auction', component: Auction },
  { path: 'teams', component: Teams },
  { path: 'players', component: Players },
  { path: '**', redirectTo: '/auction' }
];
